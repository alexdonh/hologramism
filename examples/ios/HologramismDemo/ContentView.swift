import SwiftUI
import HologramismKit

// SwiftUI twin of examples/react-native/App.tsx — same control set (mode, shape,
// layout, color/pattern or kinegram layers, glare, overlay, auto-orbit) driving
// the shared Hologramism engine.

// MARK: - Demo data

private let COLORS: [(label: String, value: HologramColor)] = [
  ("spectrum", .spectrum),
  ("gold", .gold),
  ("silver", .silver),
  ("rainbowFoil", .rainbowFoil),
  ("emerald", .emerald),
  ("sapphire", .sapphire),
  ("copper", .copper),
  // Bare RGBA[] = custom palette.
  ("custom", .palette([[255, 0, 128, 255], [0, 220, 255, 255]])),
]

private let GLARES: [(label: String, value: Double)] = [
  ("off", 0), ("soft", 0.6), ("normal", 1.0), ("strong", 1.6),
]

private let PRESETS: [(label: String, value: HologramPreset)] = [
  ("guilloche", Preset.guilloche()),
  ("concentric", Preset.concentric()),
  ("radial", Preset.radial()),
  ("linear", Preset.linear()),
  ("dotMatrix", Preset.dotMatrix()),
  ("rosette", Preset.rosette()),
  ("lattice", Preset.lattice()),
  ("rainbow", Preset.rainbow()),
]

private let LAYOUTS: [(label: String, value: HologramLayout?)] = [
  ("single", nil),
  ("tile 4×4", Layout.tile(size: 0.22, gap: 0.03)),
  ("tile 7×7", Layout.tile(size: 0.13, gap: 0.02)),
  ("tile + gap", Layout.tile(size: 0.16, gap: 0.12)),
  ("tile fill", Layout.tile(size: 0.2, gap: 0.06, fit: .fill)),
  ("corner", Layout.single(size: 0.4, position: [0.22, 0.78])),
]

private enum ShapeName: String, CaseIterable {
  case rect, circle, ellipse, star, image, masked

  var label: String {
    switch self {
    case .image: return "bird"
    case .masked: return "bird·masked"
    default: return rawValue
    }
  }
}

// 5-point star polygon, points normalized 0..1.
private let STAR: [[Double]] = {
  var pts: [[Double]] = []
  for i in 0..<10 {
    let r = i % 2 == 0 ? 0.5 : 0.21
    let a = Double.pi / 5 * Double(i) - Double.pi / 2
    pts.append([0.5 + r * cos(a), 0.5 + r * sin(a)])
  }
  return pts
}()

// Transparent flying-bird PNG, bundled with the app and uploaded as base64.
private let birdBase64: String? = {
  guard let url = Bundle.main.url(forResource: "bird", withExtension: "png"),
        let data = try? Data(contentsOf: url) else { return nil }
  return data.base64EncodedString()
}()

private func shapeValue(_ name: ShapeName) -> HologramShape {
  switch name {
  case .rect: return .rect(cornerRadius: 0.18)
  case .circle: return .circle
  case .ellipse: return .ellipse
  case .star: return .polygon(points: STAR)
  case .image: return .png(base64: birdBase64, mode: .image)
  case .masked: return .png(base64: birdBase64, mode: .mask)
  }
}

private struct DemoLayer: Identifiable {
  let id = UUID()
  var presetIdx: Int
  var colorIdx: Int
}

private let DEFAULT_LAYERS: [DemoLayer] = [
  DemoLayer(presetIdx: 3, colorIdx: 1), // linear / gold
  DemoLayer(presetIdx: 5, colorIdx: 5), // rosette / sapphire
  DemoLayer(presetIdx: 1, colorIdx: 4), // concentric / emerald
]
private let MAX_LAYERS = 4

// MARK: - View

struct ContentView: View {
  @State private var multiplex = false
  @State private var shapeName: ShapeName = .rect
  @State private var layoutIdx = 0
  @State private var colorIdx = 0
  @State private var presetIdx = 0
  @State private var layers = DEFAULT_LAYERS
  @State private var overlay = false
  @State private var autoOrbit = true
  @State private var glare = 1.0

  private var scene: HologramScene {
    let shape = shapeValue(shapeName)
    let layout = LAYOUTS[layoutIdx].value
    if multiplex {
      let n = layers.count
      let built = layers.enumerated().map { i, l in
        HologramLayer(
          shape: shape,
          preset: PRESETS[l.presetIdx].value,
          color: COLORS[l.colorIdx].value,
          layout: layout,
          azimuth: Double(360 / max(n, 1)) * Double(i))
      }
      return HologramScene(layers: built, intensity: 0.95, grating: 6, iridescence: 0.65,
                           sparkle: .config(density: 0.35, intensity: 0.5), glare: glare)
    } else {
      return HologramScene(
        layers: [HologramLayer(shape: shape, preset: PRESETS[presetIdx].value,
                               color: COLORS[colorIdx].value, layout: layout)],
        color: COLORS[colorIdx].value,
        intensity: 0.95, grating: 6, iridescence: 0.65,
        sparkle: .config(density: 0.35, intensity: 0.5), glare: glare)
    }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 14) {
        Text("Hologramism")
          .font(.system(size: 30, weight: .heavy))
          .foregroundColor(.white)
          .padding(.top, 8)
        Text("Drag the card to tilt it — or watch it auto-orbit.")
          .font(.system(size: 13))
          .foregroundColor(Color(white: 0.55))
          .padding(.bottom, 8)

        card

        Section("Mode") {
          Chip("single", active: !multiplex) { multiplex = false }
          Chip("multiplex (kinegram)", active: multiplex) { multiplex = true }
        }

        Section("Shape") {
          ForEach(ShapeName.allCases, id: \.self) { s in
            Chip(s.label, active: shapeName == s) { shapeName = s }
          }
        }

        Section("Layout (placement / repeat)") {
          ForEach(Array(LAYOUTS.enumerated()), id: \.offset) { i, l in
            Chip(l.label, active: layoutIdx == i) { layoutIdx = i }
          }
        }

        if multiplex {
          ForEach(Array(layers.enumerated()), id: \.element.id) { i, _ in
            layerCard(i)
          }
          if layers.count < MAX_LAYERS {
            Button { layers.append(DemoLayer(presetIdx: 3, colorIdx: 0)) } label: {
              Text("+ Add layer").foregroundColor(Color(red: 0.54, green: 0.54, blue: 1))
            }
            .frame(maxWidth: .infinity).padding(.vertical, 12)
          }
        } else {
          Section("Color") {
            ForEach(Array(COLORS.enumerated()), id: \.offset) { i, c in
              Chip(c.label, active: colorIdx == i) { colorIdx = i }
            }
          }
          Section("Pattern") {
            ForEach(Array(PRESETS.enumerated()), id: \.offset) { i, p in
              Chip(p.label, active: presetIdx == i) { presetIdx = i }
            }
          }
        }

        Section("Glare (light sweep)") {
          ForEach(Array(GLARES.enumerated()), id: \.offset) { _, g in
            Chip(g.label, active: glare == g.value) { glare = g.value }
          }
        }
        Section("Overlay on photo (picsum)") {
          Chip("off", active: !overlay) { overlay = false }
          Chip("on", active: overlay) { overlay = true }
        }
        Section("Auto-orbit") {
          Chip("off", active: !autoOrbit) { autoOrbit = false }
          Chip("on", active: autoOrbit) { autoOrbit = true }
        }
      }
      .padding(20)
    }
    .background(Color(red: 0.04, green: 0.04, blue: 0.06).ignoresSafeArea())
  }

  private var card: some View {
    ZStack {
      if overlay {
        AsyncImage(url: URL(string: "https://picsum.photos/seed/holo/600/380")) { img in
          img.resizable().scaledToFill()
        } placeholder: { Color.black }
      }
      Hologram(scene: scene, tilt: Tilt(autoOrbit: autoOrbit))
    }
    .frame(width: 300, height: 190)
    .background(Color(red: 0.04, green: 0.04, blue: 0.06))
    .clipShape(RoundedRectangle(cornerRadius: 18))
    .padding(.bottom, 8)
  }

  private func layerCard(_ i: Int) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("Layer \(i + 1)").font(.system(size: 14, weight: .bold)).foregroundColor(.white)
        Spacer()
        if layers.count > 1 {
          Button { layers.remove(at: i) } label: {
            Text("✕").foregroundColor(Color(white: 0.48))
          }
        }
      }
      Text("PATTERN").font(.system(size: 11)).foregroundColor(Color(white: 0.42))
      chipRow {
        ForEach(Array(PRESETS.enumerated()), id: \.offset) { idx, p in
          Chip(p.label, active: layers[i].presetIdx == idx) { layers[i].presetIdx = idx }
        }
      }
      Text("COLOR").font(.system(size: 11)).foregroundColor(Color(white: 0.42))
      chipRow {
        ForEach(Array(COLORS.enumerated()), id: \.offset) { idx, c in
          Chip(c.label, active: layers[i].colorIdx == idx) { layers[i].colorIdx = idx }
        }
      }
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color(red: 0.075, green: 0.075, blue: 0.11))
    .clipShape(RoundedRectangle(cornerRadius: 14))
  }

  // A horizontally scrolling row of chips.
  private func chipRow<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) { content() }
    }
  }

  @ViewBuilder
  private func Section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(title.uppercased())
        .font(.system(size: 12)).kerning(1)
        .foregroundColor(Color(white: 0.72))
      chipRow(content)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// MARK: - Chip

private struct Chip: View {
  let label: String
  let active: Bool
  let action: () -> Void

  init(_ label: String, active: Bool, action: @escaping () -> Void) {
    self.label = label
    self.active = active
    self.action = action
  }

  var body: some View {
    Button(action: action) {
      Text(label)
        .font(.system(size: 13, weight: active ? .bold : .regular))
        .foregroundColor(active ? .white : Color(white: 0.6))
        .padding(.horizontal, 14).padding(.vertical, 8)
        .background(active ? Color(red: 0.29, green: 0.29, blue: 1) : Color(red: 0.11, green: 0.11, blue: 0.15))
        .clipShape(Capsule())
    }
    .buttonStyle(.plain)
  }
}
