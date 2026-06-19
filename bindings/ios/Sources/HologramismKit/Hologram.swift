import SwiftUI

/// Orientation / interaction sources for a hologram (all default on).
public struct Tilt {
  public var motion: Bool
  public var gesture: Bool
  public var autoOrbit: Bool

  public init(motion: Bool = true, gesture: Bool = true, autoOrbit: Bool = true) {
    self.motion = motion
    self.gesture = gesture
    self.autoOrbit = autoOrbit
  }

  var dictionary: [String: Any] {
    ["motion": motion, "gesture": gesture, "autoOrbit": autoOrbit]
  }
}

/// SwiftUI hologram. Transparent / overlay-able by default; reacts to device
/// motion (or pan / idle auto-orbit on the simulator).
///
/// ```swift
/// Hologram(scene: HologramScene(preset: Preset.guilloche(), color: .gold))
///     .frame(width: 300, height: 190)
/// ```
@available(iOS 13.0, *)
public struct Hologram: UIViewRepresentable {
  public let scene: HologramScene
  public var tilt: Tilt

  public init(scene: HologramScene, tilt: Tilt = Tilt()) {
    self.scene = scene
    self.tilt = tilt
  }

  public func makeCoordinator() -> Coordinator { Coordinator() }

  public func makeUIView(context: Context) -> HologramView {
    let view = HologramView()
    apply(to: view, context: context)
    return view
  }

  public func updateUIView(_ view: HologramView, context: Context) {
    apply(to: view, context: context)
  }

  // Re-send only when the resolved scene / tilt actually changed — SwiftUI calls
  // updateUIView frequently, and resolving a scene can trigger image fetches.
  private func apply(to view: HologramView, context: Context) {
    let sceneDict = scene.dictionary as NSDictionary
    let tiltDict = tilt.dictionary as NSDictionary
    if context.coordinator.lastTilt != tiltDict {
      view.setTilt(tiltDict)
      context.coordinator.lastTilt = tiltDict
    }
    if context.coordinator.lastScene != sceneDict {
      view.setScene(sceneDict)
      context.coordinator.lastScene = sceneDict
    }
  }

  public final class Coordinator {
    var lastScene: NSDictionary?
    var lastTilt: NSDictionary?
  }
}
