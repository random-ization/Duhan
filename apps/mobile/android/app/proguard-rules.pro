# Kotlin Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.hangyeol.app.compose.data.convex.dto.**$$serializer { *; }
-keepclassmembers class com.hangyeol.app.compose.data.convex.dto.** {
    *** Companion;
}
-keepclasseswithmembers class com.hangyeol.app.compose.data.convex.dto.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Retrofit + OkHttp
-keepattributes Signature
-keepattributes *Annotation*
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * { @retrofit2.http.* <methods>; }
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**

# Convex API DTOs + sealed result
-keep class com.hangyeol.app.compose.data.convex.ConvexResult { *; }
-keep class com.hangyeol.app.compose.data.convex.ConvexResult$Success { *; }
-keep class com.hangyeol.app.compose.data.convex.ConvexResult$Error { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# DataStore / Preferences
-keepclassmembers class * extends androidx.datastore.preferences.protobuf.GeneratedMessageLite {
    <fields>;
}

# ViewModel
-keep class * extends androidx.lifecycle.ViewModel { *; }
