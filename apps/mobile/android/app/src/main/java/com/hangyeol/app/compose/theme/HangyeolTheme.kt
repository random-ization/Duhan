package com.hangyeol.app.compose.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val HangyeolLightColors =
  lightColorScheme(
    primary = Color(0xFF1F1B17),
    onPrimary = Color(0xFFFBF8F3),
    secondary = Color(0xFFC97A6E),
    onSecondary = Color.White,
    tertiary = Color(0xFF5B8472),
    onTertiary = Color.White,
    background = Color(0xFFFBF8F3),
    onBackground = Color(0xFF1F1B17),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1F1B17),
    surfaceVariant = Color(0xFFF5EFE5),
    onSurfaceVariant = Color(0xFF3D3832),
    outline = Color(0x24201B17),
    error = Color(0xFFA23B2E),
    onError = Color.White,
  )

private val HangyeolDarkColors =
  darkColorScheme(
    primary = Color(0xFFFBF8F3),
    onPrimary = Color(0xFF1F1B17),
    secondary = Color(0xFFF5C7C0),
    onSecondary = Color(0xFF1F1B17),
    tertiary = Color(0xFFC8DCCF),
    onTertiary = Color(0xFF1F1B17),
    background = Color(0xFF1F1B17),
    onBackground = Color(0xFFFBF8F3),
    surface = Color(0xFF2A2520),
    onSurface = Color(0xFFFBF8F3),
    surfaceVariant = Color(0xFF3D3832),
    onSurfaceVariant = Color(0xFFF5EFE5),
    outline = Color(0x40FBF8F3),
    error = Color(0xFFF5C7C0),
    onError = Color(0xFF1F1B17),
  )

@Immutable
data class HangyeolSpacing(
  val xs: androidx.compose.ui.unit.Dp = 4.dp,
  val sm: androidx.compose.ui.unit.Dp = 8.dp,
  val md: androidx.compose.ui.unit.Dp = 12.dp,
  val lg: androidx.compose.ui.unit.Dp = 16.dp,
  val xl: androidx.compose.ui.unit.Dp = 20.dp,
  val x2l: androidx.compose.ui.unit.Dp = 24.dp,
  val x3l: androidx.compose.ui.unit.Dp = 32.dp,
)

@Immutable
data class HangyeolRadii(
  val sm: androidx.compose.ui.unit.Dp = 12.dp,
  val md: androidx.compose.ui.unit.Dp = 14.dp,
  val lg: androidx.compose.ui.unit.Dp = 16.dp,
  val xl: androidx.compose.ui.unit.Dp = 20.dp,
  val x3l: androidx.compose.ui.unit.Dp = 28.dp,
)

@Immutable
data class HangyeolExtendedColors(
  val lineSoft: Color = Color(0x14201B17),
  val lineStrong: Color = Color(0x24201B17),
  val subtext: Color = Color(0xFF8C8377),
  val subtextLight: Color = Color(0xFFB8AFA2),
  val crimson: Color = Color(0xFFA23B2E),
  val indigo: Color = Color(0xFF2F3F68),
  val jade: Color = Color(0xFF4C6B4E),
  val gold: Color = Color(0xFFB38941),
  val tintPink: Color = Color(0x40F5C7C0),
  val tintMint: Color = Color(0x40C8DCCF),
  val tintButter: Color = Color(0x55F7E8B8),
  val tintLilac: Color = Color(0x50D8CFE6),
  val sky: Color = Color(0xFFBDD4E0),
  val skyDeep: Color = Color(0xFF3F6A85),
  val surfaceMuted: Color = Color(0xFFF5EFE5),
  val disabledBg: Color = Color(0x0F1F1B17),
  val disabledFg: Color = Color(0x591F1B17),
  val tabBar: Color = Color(0xF2FBF8F3),
  val tabBarBorder: Color = Color(0x14201B17),
  val overlay: Color = Color(0x59201B17),
)

val LocalHangyeolSpacing = staticCompositionLocalOf { HangyeolSpacing() }
val LocalHangyeolRadii = staticCompositionLocalOf { HangyeolRadii() }
val LocalHangyeolExtendedColors = staticCompositionLocalOf { HangyeolExtendedColors() }

private val HangyeolTypography =
  Typography(
    headlineLarge =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 30.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.8).sp,
      ),
    headlineMedium =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 32.sp,
        letterSpacing = (-0.8).sp,
      ),
    titleLarge =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 20.sp,
        lineHeight = 25.sp,
        letterSpacing = (-0.3).sp,
      ),
    titleMedium =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 16.sp,
        lineHeight = 21.sp,
        letterSpacing = (-0.2).sp,
      ),
    bodyLarge =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 15.sp,
        lineHeight = 23.sp,
      ),
    bodyMedium =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
      ),
    bodySmall =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 18.sp,
      ),
    labelLarge =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
      ),
    labelSmall =
      TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 10.sp,
        lineHeight = 12.sp,
        letterSpacing = 0.4.sp,
      ),
  )

private val HangyeolShapes =
  Shapes(
    small = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(28.dp),
  )

object HangyeolTheme {
  val spacing: HangyeolSpacing
    @Composable get() = LocalHangyeolSpacing.current

  val radii: HangyeolRadii
    @Composable get() = LocalHangyeolRadii.current

  val extendedColors: HangyeolExtendedColors
    @Composable get() = LocalHangyeolExtendedColors.current

  val colorScheme: ColorScheme
    @Composable get() = MaterialTheme.colorScheme

  val typography: Typography
    @Composable get() = MaterialTheme.typography
}

@Composable
fun HangyeolAppTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  content: @Composable () -> Unit,
) {
  val colors = if (darkTheme) HangyeolDarkColors else HangyeolLightColors
  CompositionLocalProvider(
    LocalHangyeolSpacing provides HangyeolSpacing(),
    LocalHangyeolRadii provides HangyeolRadii(),
    LocalHangyeolExtendedColors provides HangyeolExtendedColors(),
  ) {
    MaterialTheme(
      colorScheme = colors,
      typography = HangyeolTypography,
      shapes = HangyeolShapes,
    ) {
      content()
    }
  }
}
