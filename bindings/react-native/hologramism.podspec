require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "hologramism"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/alexdonh/hologramism"
  s.license      = "MIT"
  s.authors      = "Alex Do"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/alexdonh/hologramism.git", :tag => "v#{s.version}" }

  # Only the thin RN bridge (view manager) lives here now; the UIKit view, the
  # GPU engine, and its system frameworks all come from the `HologramismKit` pod.
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"
  s.dependency "HologramismKit", package["version"]
end
