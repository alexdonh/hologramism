# Thin Flutter plugin pod: registers a platform view that wraps the shared
# `HologramismKit` Swift package (engine + UIKit view). The version is derived from
# pubspec.yaml so a single `scripts/release.sh` bump keeps everything in lockstep,
# and the `HologramismKit` dependency is pinned to that same version.
#
# Published Flutter apps add one line to ios/Podfile pointing at the matching
# release (the binary engine is not on CocoaPods trunk):
#   pod 'HologramismKit', :podspec =>
#     'https://github.com/alexdonh/hologramism/releases/download/v<version>/HologramismKit.podspec'
pubspec = File.read(File.join(__dir__, '..', 'pubspec.yaml'))
version = pubspec[/^version:\s*(.+)$/, 1].strip
# Keep the pod summary in lockstep with the pubspec description (strip quotes).
summary = pubspec[/^description:\s*(.+)$/, 1].strip.gsub(/\A["']|["']\z/, '')

Pod::Spec.new do |s|
  s.name             = 'hologramism'
  s.version          = version
  s.summary          = summary
  s.homepage         = 'https://github.com/alexdonh/hologramism'
  s.license          = { :type => 'MIT' }
  s.author           = 'Alex Do'
  s.source           = { :path => '.' }
  s.source_files     = 'Classes/**/*'
  s.platform         = :ios, '13.0'
  s.swift_version    = '5.0'

  s.dependency 'Flutter'
  s.dependency 'HologramismKit', version

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
