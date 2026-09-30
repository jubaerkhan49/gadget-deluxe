# ===================================================================
# Optimization & Code Shrinking Proguard Rules
# ===================================================================

# Retrofit & Gson Serialization / Deserialization
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.imei.inventory.data.model.** { *; }
-keep class com.imei.inventory.data.api.** { *; }

# Room Database
-keep class com.imei.inventory.data.local.** { *; }
-keepclassmembers class * extends androidx.room.RoomDatabase { *; }

# CameraX & ML Kit
-keep class com.google.mlkit.vision.barcode.** { *; }
-keep class com.google.mlkit.vision.text.** { *; }
-keep class com.google.android.gms.vision.** { *; }
-dontwarn com.google.mlkit.**
-dontwarn com.google.android.gms.**
-keep class androidx.camera.core.** { *; }
-keep class androidx.camera.camera2.** { *; }
-keep class androidx.camera.lifecycle.** { *; }
-keep class androidx.camera.view.** { *; }
-dontwarn androidx.camera.**

# Coroutines & Kotlin
-keepattributes InnerClasses, Signature, RuntimeVisibleAnnotations
-dontwarn kotlinx.coroutines.**
-dontwarn sun.misc.Unsafe

# Jetpack Compose & Material 3
-keep class androidx.compose.material.icons.** { *; }
-dontwarn androidx.compose.**

# OkHttp & Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase
