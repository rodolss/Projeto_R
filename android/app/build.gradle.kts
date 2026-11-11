plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// O número da versão vem da tag (android-vN → N), passado pelo CI com -PversaoApp=N.
val versaoApp = (project.findProperty("versaoApp") as String?)?.toIntOrNull() ?: 1
// A chave de assinatura só existe no CI (segredos do GitHub); sem ela, o release sai sem assinatura.
val caminhoChave: String? = System.getenv("ANDROID_KEYSTORE_PATH")

android {
    namespace = "io.github.rodolss.projetor"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.github.rodolss.projetor"
        minSdk = 26
        targetSdk = 34
        versionCode = versaoApp
        versionName = versaoApp.toString()
    }

    signingConfigs {
        if (caminhoChave != null) {
            create("release") {
                storeFile = file(caminhoChave)
                storePassword = System.getenv("ANDROID_KEYSTORE_SENHA")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEYSTORE_SENHA")
                storeType = "pkcs12"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (caminhoChave != null) signingConfig = signingConfigs.getByName("release")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.core:core-ktx:1.15.0")
}
