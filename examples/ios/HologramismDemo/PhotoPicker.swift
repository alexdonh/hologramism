import PhotosUI
import SwiftUI
import UIKit

/// Photo-library picker for the demo's bring-your-own-image shape.
///
/// `PHPickerViewController` rather than SwiftUI's `PhotosPicker` because the demo
/// targets iOS 15. It also runs out of process, so no `NSPhotoLibraryUsageDescription`
/// and no permission prompt are needed.
///
/// Hands back PNG base64 — the same form the bundled bird uses — downscaled to
/// `maxEdge`: in `single` layout the engine builds four full-resolution maps from
/// the source image, so an untouched 12 MP photo would be very expensive.
struct PhotoPicker: UIViewControllerRepresentable {
  /// Cleared as soon as the user picks or cancels, so the sheet closes without
  /// waiting on the decode.
  @Binding var isPresented: Bool
  /// Called with PNG base64 once decoding finishes; not called on cancel or failure.
  let onPick: (String) -> Void

  private static let maxEdge: CGFloat = 1024

  func makeUIViewController(context: Context) -> PHPickerViewController {
    var config = PHPickerConfiguration()
    config.filter = .images
    config.selectionLimit = 1
    let vc = PHPickerViewController(configuration: config)
    vc.delegate = context.coordinator
    return vc
  }

  func updateUIViewController(_ vc: PHPickerViewController, context: Context) {}

  func makeCoordinator() -> Coordinator {
    Coordinator(dismiss: { isPresented = false }, onPick: onPick)
  }

  final class Coordinator: NSObject, PHPickerViewControllerDelegate {
    private let dismiss: () -> Void
    private let onPick: (String) -> Void

    init(dismiss: @escaping () -> Void, onPick: @escaping (String) -> Void) {
      self.dismiss = dismiss
      self.onPick = onPick
    }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
      dismiss()
      guard let provider = results.first?.itemProvider,
            provider.canLoadObject(ofClass: UIImage.self)
      else { return }
      provider.loadObject(ofClass: UIImage.self) { object, _ in
        guard let base64 = (object as? UIImage).flatMap({ PhotoPicker.pngBase64(from: $0) })
        else { return }
        DispatchQueue.main.async { self.onPick(base64) }
      }
    }
  }

  /// Downscale to `maxEdge` on the longest side and encode as PNG base64.
  /// PNG (not JPEG) so any alpha in the source survives for `·masked` mode.
  private static func pngBase64(from image: UIImage) -> String? {
    let size = image.size
    let scale = min(1, maxEdge / max(size.width, size.height))
    let target = CGSize(width: max(1, size.width * scale), height: max(1, size.height * scale))

    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    let resized = UIGraphicsImageRenderer(size: target, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: target))
    }
    return resized.pngData()?.base64EncodedString()
  }
}
