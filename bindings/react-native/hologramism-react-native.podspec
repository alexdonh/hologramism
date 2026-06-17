require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "hologramism-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/alexdonh/hologramism"
  s.license      = "MIT"
  s.authors      = "Alex Do"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/alexdonh/hologramism.git", :tag => "v#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.frameworks   = "Metal", "QuartzCore", "CoreMotion"

  s.dependency "React-Core"
  s.dependency "Hologramism", package["version"]
end
