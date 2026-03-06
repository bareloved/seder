import Foundation

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: String?
    let code: String?
}

enum APIError: LocalizedError {
    case unauthorized
    case notFound(String)
    case validation(String)
    case server(String)
    case network(Error)
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "נא להתחבר מחדש"
        case .notFound(let msg): return msg
        case .validation(let msg): return msg
        case .server(let msg): return msg
        case .network(let err): return "שגיאת רשת: \(err.localizedDescription)"
        case .decodingFailed(let err): return "שגיאת נתונים: \(err.localizedDescription)"
        }
    }
}

struct EmptyData: Decodable {}
