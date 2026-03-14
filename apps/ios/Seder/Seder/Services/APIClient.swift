import Foundation

private nonisolated struct BetterAuthErrorResponse: Decodable {
    let message: String?
}

nonisolated class APIClient: @unchecked Sendable {
    static let shared = APIClient()

    // Always use production URL — localhost isn't reachable from a physical device
    private let baseURL = "https://sedder.app"

    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private let tokenKey = "seder_auth_token"

    var token: String? {
        get { KeychainService.loadString(key: tokenKey) }
        set {
            if let value = newValue {
                _ = KeychainService.saveString(key: tokenKey, value: value)
            } else {
                KeychainService.delete(key: tokenKey)
            }
        }
    }

    var isAuthenticated: Bool { token != nil }

    // MARK: - API v1 Request (wrapped in { success, data })

    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let (data, httpResponse) = try await rawRequest(
            endpoint: endpoint, method: method, body: body, queryItems: queryItems
        )

        switch httpResponse.statusCode {
        case 200, 201:
            do {
                let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)
                if apiResponse.success, let result = apiResponse.data {
                    return result
                }
                throw APIError.server(apiResponse.error ?? "Unknown error")
            } catch let error as APIError {
                throw error
            } catch {
                #if DEBUG
                if let rawJSON = String(data: data, encoding: .utf8) {
                    print("[API DECODE ERROR] \(endpoint) → \(error)")
                    print("[API RAW JSON] \(rawJSON.prefix(2000))")
                }
                #endif
                throw APIError.decodingFailed(error)
            }
        case 401:
            self.token = nil
            throw APIError.unauthorized
        case 404:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.notFound(apiResponse?.error ?? "Not found")
        case 429:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.rateLimited(apiResponse?.error ?? "נסה שוב מאוחר יותר")
        default:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.server(apiResponse?.error ?? "Server error (\(httpResponse.statusCode))")
        }
    }

    // MARK: - Direct Request (no wrapper, for Better Auth endpoints)

    func directRequest<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let (data, httpResponse) = try await rawRequest(
            endpoint: endpoint, method: method, body: body, queryItems: queryItems
        )

        #if DEBUG
        if let rawJSON = String(data: data, encoding: .utf8) {
            print("[\(endpoint)] status=\(httpResponse.statusCode) body=\(rawJSON)")
        }
        #endif

        switch httpResponse.statusCode {
        case 200, 201:
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                print("[DECODE ERROR] \(error)")
                throw APIError.decodingFailed(error)
            }
        case 401:
            throw APIError.unauthorized
        case 422:
            let authError = try? decoder.decode(BetterAuthErrorResponse.self, from: data)
            throw APIError.validation(authError?.message ?? "Validation error")
        default:
            let authError = try? decoder.decode(BetterAuthErrorResponse.self, from: data)
            throw APIError.server(authError?.message ?? "Server error (\(httpResponse.statusCode))")
        }
    }

    // MARK: - Nudges

    func fetchNudges() async throws -> [Nudge] {
        return try await request(endpoint: "/api/v1/nudges", method: "GET")
    }

    func dismissNudge(_ nudgeType: String, entryId: String?, periodKey: String?, snooze: Bool = false, snoozeDays: Int? = nil) async throws {
        let body = DismissNudgeRequest(
            nudgeType: nudgeType,
            entryId: entryId,
            periodKey: periodKey,
            snooze: snooze,
            snoozeDays: snoozeDays
        )
        let _: EmptyData = try await request(endpoint: "/api/v1/nudges", method: "POST", body: body)
    }

    // MARK: - Raw Request

    private func rawRequest(
        endpoint: String,
        method: String,
        body: (any Encodable)?,
        queryItems: [URLQueryItem]?
    ) async throws -> (Data, HTTPURLResponse) {
        var components = URLComponents(string: baseURL + endpoint)!
        if let queryItems { components.queryItems = queryItems }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(baseURL, forHTTPHeaderField: "Origin")

        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try encoder.encode(body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.network(URLError(.badServerResponse))
        }

        return (data, httpResponse)
    }
}
