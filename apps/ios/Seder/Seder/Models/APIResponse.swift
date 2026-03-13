import Foundation

nonisolated struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: String?
    let code: String?
}

nonisolated enum APIError: LocalizedError {
    case unauthorized
    case notFound(String)
    case validation(String)
    case server(String)
    case network(Error)
    case decodingFailed(Error)
    case rateLimited(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "נא להתחבר מחדש"
        case .notFound(let msg): return msg.isEmpty ? "לא נמצא" : msg
        case .validation(let msg): return msg
        case .server(let msg): return msg.isEmpty ? "שגיאת שרת. נסו שוב." : msg
        case .network: return "בעיית חיבור. בדקו את האינטרנט."
        case .decodingFailed: return "שגיאה בעיבוד הנתונים"
        case .rateLimited(let msg): return msg
        }
    }
}

nonisolated struct EmptyData: Decodable {}
