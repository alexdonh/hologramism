pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "hologramism-demo"
include(":app")

// Build the native binding from source for local dev (no publish step needed).
// Gradle substitutes `io.github.alexdonh:hologramism` with the included :hologramism
// module. Run scripts/build_android.sh first so the prebuilt .so is in jniLibs.
includeBuild("../../bindings/android")
