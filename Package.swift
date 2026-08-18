// swift-tools-version:5.7
import PackageDescription

// The public Swift API module is `HologramismKit`; it wraps the binary C-ABI module
// `HologramismFFI` (the prebuilt Rust engine, shipped as an xcframework).
//
// The `.binaryTarget` below uses a LOCAL path for development: run
// `scripts/build_ios_xcframework.sh` once to produce dist/ios/HologramismFFI.xcframework.
// The release pipeline (.github/workflows/release.yml) rewrites the block between
// the BINARY-TARGET markers to a remote `.binaryTarget(url:checksum:)` pointing at
// the GitHub Release zip, so published consumers need no local build.
let package = Package(
    name: "HologramismKit",
    platforms: [.iOS(.v13)],
    products: [
        .library(name: "HologramismKit", targets: ["HologramismKit"]),
    ],
    targets: [
        // BINARY-TARGET-START
        .binaryTarget(
            name: "HologramismFFI",
            url: "https://github.com/alexdonh/hologramism/releases/download/v1.0.4/HologramismFFI.zip",
            checksum: "7b841f4a30a4df081b97efe8eaa0de73a16ea623b6381a8bb50a014eee174ab6"
        ),
        // BINARY-TARGET-END
        .target(
            name: "HologramismKit",
            dependencies: ["HologramismFFI"],
            path: "bindings/ios/Sources/HologramismKit"
        ),
    ]
)
