import Foundation

class APIClient {
    static let shared = APIClient()

    #if DEBUG
    private let baseURL = "http://localhost:3001"
    #else
    private let baseURL = "https://sedder.app"
    #endif

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

    // MARK: - Generic Request

    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        var components = URLComponents(string: baseURL + endpoint)!
        if let queryItems { components.queryItems = queryItems }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

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
                throw APIError.decodingFailed(error)
            }
        case 401:
            self.token = nil
            throw APIError.unauthorized
        case 404:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.notFound(apiResponse?.error ?? "Not found")
        default:
            let apiResponse = try? decoder.decode(APIResponse<EmptyData>.self, from: data)
            throw APIError.server(apiResponse?.error ?? "Server error (\(httpResponse.statusCode))")
        }
    }
}
