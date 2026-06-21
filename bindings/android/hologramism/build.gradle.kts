import com.vanniktech.maven.publish.SonatypeHost

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.vanniktech.maven.publish") version "0.30.0"
}

// Version mirrors the rest of the workspace (Cargo / npm / pubspec). Read from
// the RN package.json so a single bump (scripts/release.sh) covers every binding.
val pkgVersion: String = run {
    val pkg = file("../../react-native/package.json").readText()
    Regex("\"version\"\\s*:\\s*\"([^\"]+)\"").find(pkg)?.groupValues?.get(1) ?: "0.0.0"
}

// Maven coordinate group (publishing); matches the Android/Kotlin namespace
// below (io.github.alexdonh.hologramism); consumers `import
// io.github.alexdonh.hologramism.*`.
group = "io.github.alexdonh"
version = pkgVersion

android {
    namespace = "io.github.alexdonh.hologramism"
    compileSdk = 34

    defaultConfig {
        minSdk = 24 // wgpu Vulkan/GL backend floor.
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }
        externalNativeBuild {
            cmake {
                arguments += "-DANDROID_STL=c++_shared"
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    // The prebuilt Rust engine (libhlg_ffi.so per ABI) is dropped here by
    // scripts/build_android.sh and packaged into the AAR alongside the JNI shim.
    sourceSets["main"].jniLibs.srcDirs("src/main/jniLibs")

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.annotation:annotation:1.8.0")
}

// Publish to Maven Central via the Sonatype Central Portal (consumers resolve it
// anonymously; no credentials). The Vanniktech plugin wires up the release AAR
// + sources/javadoc jars, GPG-signs everything, and uploads.
//
// Required credentials (CI secrets -> env, or ~/.gradle/gradle.properties):
//   ORG_GRADLE_PROJECT_mavenCentralUsername       Central Portal token user
//   ORG_GRADLE_PROJECT_mavenCentralPassword       Central Portal token pass
//   ORG_GRADLE_PROJECT_signingInMemoryKey         armored GPG private key
//   ORG_GRADLE_PROJECT_signingInMemoryKeyPassword GPG key passphrase
mavenPublishing {
    publishToMavenCentral(SonatypeHost.CENTRAL_PORTAL)
    // Sign only when a key is configured (CI / Central uploads). Local dev:
    // `publishToMavenLocal` for the RN/Flutter examples, runs unsigned.
    // ORG_GRADLE_PROJECT_signingInMemoryKey is exposed as the `signingInMemoryKey`
    // project property.
    if (project.findProperty("signingInMemoryKey") != null) {
        signAllPublications()
    }
    coordinates("io.github.alexdonh", "hologramism", pkgVersion)
    pom {
        name.set("Hologramism")
        description.set("Motion-reactive security-hologram (DOVID/Kinegram) view for Android: GPU-rendered with Rust + wgpu/Vulkan.")
        url.set("https://github.com/alexdonh/hologramism")
        licenses {
            license {
                name.set("MIT")
                url.set("https://opensource.org/licenses/MIT")
            }
        }
        developers {
            developer {
                id.set("alexdonh")
                name.set("Tan Do")
                url.set("https://github.com/alexdonh")
            }
        }
        scm {
            url.set("https://github.com/alexdonh/hologramism")
            connection.set("scm:git:https://github.com/alexdonh/hologramism.git")
            developerConnection.set("scm:git:ssh://git@github.com/alexdonh/hologramism.git")
        }
    }
}
