package com.imei.inventory.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

// ==========================================
// MATERIAL 3 EXPRESSIVE COLOR SYSTEM
// ==========================================

// Primary Palette: Premium Clean Sapphire Blue (matching web app #2563EB / #3B82F6)
val ExpressivePrimaryDark = Color(0xFF60A5FA) // Vibrant Blue 400
val ExpressiveOnPrimaryDark = Color(0xFF0F172A)
val ExpressivePrimaryContainerDark = Color(0xFF1E3A8A) // Deep Navy Blue
val ExpressiveOnPrimaryContainerDark = Color(0xFFDBEAFE)

val ExpressivePrimaryLight = Color(0xFF2563EB) // Premium Royal Blue 600
val ExpressiveOnPrimaryLight = Color(0xFFFFFFFF)
val ExpressivePrimaryContainerLight = Color(0xFFEFF6FF) // Crisp Soft Blue Tint
val ExpressiveOnPrimaryContainerLight = Color(0xFF1E40AF)

// Secondary Palette: Radiant Emerald / Mint
val ExpressiveSecondaryDark = Color(0xFF34D399) // Emerald 400
val ExpressiveOnSecondaryDark = Color(0xFF064E3B)
val ExpressiveSecondaryContainerDark = Color(0xFF065F46)
val ExpressiveOnSecondaryContainerDark = Color(0xFFD1FAE5)

val ExpressiveSecondaryLight = Color(0xFF10B981) // Emerald 500
val ExpressiveOnSecondaryLight = Color(0xFFFFFFFF)
val ExpressiveSecondaryContainerLight = Color(0xFFECFDF5)
val ExpressiveOnSecondaryContainerLight = Color(0xFF064E3B)

// Tertiary Palette: Warm Sunset Amber / Coral
val ExpressiveTertiaryDark = Color(0xFFFBBF24) // Amber 400
val ExpressiveOnTertiaryDark = Color(0xFF451A03)
val ExpressiveTertiaryContainerDark = Color(0xFF78350F)
val ExpressiveOnTertiaryContainerDark = Color(0xFFFEF3C7)

val ExpressiveTertiaryLight = Color(0xFFF59E0B) // Amber 500
val ExpressiveOnTertiaryLight = Color(0xFFFFFFFF)
val ExpressiveTertiaryContainerLight = Color(0xFFFFFBEB)
val ExpressiveOnTertiaryContainerLight = Color(0xFF78350F)

// Error Palette: Vivid Rose
val ExpressiveErrorDark = Color(0xFFF87171)
val ExpressiveOnErrorDark = Color(0xFF450A0A)
val ExpressiveErrorContainerDark = Color(0xFF7F1D1D)
val ExpressiveOnErrorContainerDark = Color(0xFFFEE2E2)

val ExpressiveErrorLight = Color(0xFFEF4444)
val ExpressiveOnErrorLight = Color(0xFFFFFFFF)
val ExpressiveErrorContainerLight = Color(0xFFFEF2F2)
val ExpressiveOnErrorContainerLight = Color(0xFF991B1B)

// Surface Container Hierarchy (Dark - Deep Midnight Slate)
val ExpressiveDarkBackground = Color(0xFF0B0F19)
val ExpressiveDarkSurface = Color(0xFF0F172A)
val ExpressiveDarkSurfaceContainerLowest = Color(0xFF080D1A)
val ExpressiveDarkSurfaceContainerLow = Color(0xFF131D31)
val ExpressiveDarkSurfaceContainer = Color(0xFF1E293B)
val ExpressiveDarkSurfaceContainerHigh = Color(0xFF243044)
val ExpressiveDarkSurfaceContainerHighest = Color(0xFF334155)
val ExpressiveDarkOnBackground = Color(0xFFF8FAFC)
val ExpressiveDarkOnSurface = Color(0xFFF1F5F9)
val ExpressiveDarkOnSurfaceVariant = Color(0xFF94A3B8)
val ExpressiveDarkOutline = Color(0xFF475569)
val ExpressiveDarkOutlineVariant = Color(0xFF334155)

// Surface Container Hierarchy (Light - Sophisticated Enterprise Canvas & Crisp Surfaces)
val ExpressiveLightBackground = Color(0xFFF1F5F9) // Calming, professional Slate-100 canvas (no more washed-out whiteout)
val ExpressiveLightSurface = Color(0xFFFFFFFF) // Crisp pure white for cards, sheets, dialogs
val ExpressiveLightSurfaceContainerLowest = Color(0xFFFFFFFF)
val ExpressiveLightSurfaceContainerLow = Color(0xFFFFFFFF)
val ExpressiveLightSurfaceContainer = Color(0xFFF8FAFC) // Slate-50 for subtle inner containers
val ExpressiveLightSurfaceContainerHigh = Color(0xFFFFFFFF) // Pure white for elevated elements
val ExpressiveLightSurfaceContainerHighest = Color(0xFFE2E8F0) // Slate-200 for tracks and inset containers
val ExpressiveLightOnBackground = Color(0xFF0F172A) // Deep Charcoal Slate for maximum legibility
val ExpressiveLightOnSurface = Color(0xFF0F172A)
val ExpressiveLightOnSurfaceVariant = Color(0xFF64748B) // Balanced slate for secondary metadata
val ExpressiveLightOutline = Color(0xFFCBD5E1)
val ExpressiveLightOutlineVariant = Color(0xFFE2E8F0)

// Semantic Accent Constants (Harmonized, Clean Saturation)
val AccentEmerald = Color(0xFF10B981)
val AccentSky = Color(0xFF0284C7)
val AccentAmber = Color(0xFFF59E0B)
val AccentPurple = Color(0xFF8B5CF6)
val AccentRose = Color(0xFFEF4444)
val AccentBlue = Color(0xFF2563EB)

// Legacy palette aliases for backward compatibility
val DarkBackground = ExpressiveDarkBackground
val DarkSurface = ExpressiveDarkSurfaceContainer
val DarkSurfaceVariant = ExpressiveDarkSurfaceContainerHigh
val DarkPrimary = ExpressivePrimaryDark
val DarkPrimaryAccent = ExpressivePrimaryContainerDark
val DarkOnBackground = ExpressiveDarkOnBackground
val DarkOnSurface = ExpressiveDarkOnSurface
val DarkOnSurfaceVariant = ExpressiveDarkOnSurfaceVariant

val LightBackground = ExpressiveLightBackground
val LightSurface = ExpressiveLightSurface
val LightSurfaceVariant = ExpressiveLightSurfaceContainerLow
val LightPrimary = ExpressivePrimaryLight
val LightPrimaryAccent = ExpressivePrimaryContainerLight
val LightOnBackground = ExpressiveLightOnBackground
val LightOnSurface = ExpressiveLightOnSurface
val LightOnSurfaceVariant = ExpressiveLightOnSurfaceVariant

// Color schemes
private val ExpressiveDarkColorScheme = darkColorScheme(
    primary = ExpressivePrimaryDark,
    onPrimary = ExpressiveOnPrimaryDark,
    primaryContainer = ExpressivePrimaryContainerDark,
    onPrimaryContainer = ExpressiveOnPrimaryContainerDark,
    secondary = ExpressiveSecondaryDark,
    onSecondary = ExpressiveOnSecondaryDark,
    secondaryContainer = ExpressiveSecondaryContainerDark,
    onSecondaryContainer = ExpressiveOnSecondaryContainerDark,
    tertiary = ExpressiveTertiaryDark,
    onTertiary = ExpressiveOnTertiaryDark,
    tertiaryContainer = ExpressiveTertiaryContainerDark,
    onTertiaryContainer = ExpressiveOnTertiaryContainerDark,
    error = ExpressiveErrorDark,
    onError = ExpressiveOnErrorDark,
    errorContainer = ExpressiveErrorContainerDark,
    onErrorContainer = ExpressiveOnErrorContainerDark,
    background = ExpressiveDarkBackground,
    onBackground = ExpressiveDarkOnBackground,
    surface = ExpressiveDarkSurface,
    onSurface = ExpressiveDarkOnSurface,
    surfaceVariant = ExpressiveDarkSurfaceContainerHigh,
    onSurfaceVariant = ExpressiveDarkOnSurfaceVariant,
    surfaceContainerLowest = ExpressiveDarkSurfaceContainerLowest,
    surfaceContainerLow = ExpressiveDarkSurfaceContainerLow,
    surfaceContainer = ExpressiveDarkSurfaceContainer,
    surfaceContainerHigh = ExpressiveDarkSurfaceContainerHigh,
    surfaceContainerHighest = ExpressiveDarkSurfaceContainerHighest,
    outline = ExpressiveDarkOutline,
    outlineVariant = ExpressiveDarkOutlineVariant
)

private val ExpressiveLightColorScheme = lightColorScheme(
    primary = ExpressivePrimaryLight,
    onPrimary = ExpressiveOnPrimaryLight,
    primaryContainer = ExpressivePrimaryContainerLight,
    onPrimaryContainer = ExpressiveOnPrimaryContainerLight,
    secondary = ExpressiveSecondaryLight,
    onSecondary = ExpressiveOnSecondaryLight,
    secondaryContainer = ExpressiveSecondaryContainerLight,
    onSecondaryContainer = ExpressiveOnSecondaryContainerLight,
    tertiary = ExpressiveTertiaryLight,
    onTertiary = ExpressiveOnTertiaryLight,
    tertiaryContainer = ExpressiveTertiaryContainerLight,
    onTertiaryContainer = ExpressiveOnTertiaryContainerLight,
    error = ExpressiveErrorLight,
    onError = ExpressiveOnErrorLight,
    errorContainer = ExpressiveErrorContainerLight,
    onErrorContainer = ExpressiveOnErrorContainerLight,
    background = ExpressiveLightBackground,
    onBackground = ExpressiveLightOnBackground,
    surface = ExpressiveLightSurface,
    onSurface = ExpressiveLightOnSurface,
    surfaceVariant = ExpressiveLightSurfaceContainerLow,
    onSurfaceVariant = ExpressiveLightOnSurfaceVariant,
    surfaceContainerLowest = ExpressiveLightSurfaceContainerLowest,
    surfaceContainerLow = ExpressiveLightSurfaceContainerLow,
    surfaceContainer = ExpressiveLightSurfaceContainer,
    surfaceContainerHigh = ExpressiveLightSurfaceContainerHigh,
    surfaceContainerHighest = ExpressiveLightSurfaceContainerHighest,
    outline = ExpressiveLightOutline,
    outlineVariant = ExpressiveLightOutlineVariant
)

// ==========================================
// MATERIAL 3 EXPRESSIVE SHAPES
// ==========================================
val ExpressiveShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

// ==========================================
// MATERIAL 3 EXPRESSIVE TYPOGRAPHY SCALE
// ==========================================
val ExpressiveTypography = Typography(
    displayLarge = TextStyle(
        fontWeight = FontWeight.ExtraBold,
        fontSize = 34.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.5).sp
    ),
    displayMedium = TextStyle(
        fontWeight = FontWeight.ExtraBold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.25).sp
    ),
    displaySmall = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp
    ),
    headlineLarge = TextStyle(
        fontWeight = FontWeight.ExtraBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.2).sp
    ),
    headlineMedium = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    headlineSmall = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        lineHeight = 22.sp
    ),
    titleMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        lineHeight = 20.sp
    ),
    titleSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        lineHeight = 18.sp
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 18.sp
    ),
    bodySmall = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 11.5.sp,
        lineHeight = 16.sp
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp,
        lineHeight = 18.sp
    ),
    labelMedium = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 14.sp
    ),
    labelSmall = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 9.5.sp,
        lineHeight = 12.sp,
        letterSpacing = 0.5.sp
    )
)

// Extended custom semantic colors
data class ExpressiveCustomColors(
    val emerald: Color,
    val onEmerald: Color,
    val sky: Color,
    val onSky: Color,
    val amber: Color,
    val onAmber: Color,
    val purple: Color,
    val onPurple: Color,
    val cardBorder: Color
)

val LocalExpressiveColors = staticCompositionLocalOf {
    ExpressiveCustomColors(
        emerald = AccentEmerald,
        onEmerald = Color.White,
        sky = AccentSky,
        onSky = Color.White,
        amber = AccentAmber,
        onAmber = Color.White,
        purple = AccentPurple,
        onPurple = Color.White,
        cardBorder = Color(0x1EFFFFFF)
    )
}

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) ExpressiveDarkColorScheme else ExpressiveLightColorScheme
    val customColors = ExpressiveCustomColors(
        emerald = if (darkTheme) Color(0xFF34D399) else Color(0xFF059669),
        onEmerald = Color.White,
        sky = if (darkTheme) Color(0xFF38BDF8) else Color(0xFF0284C7),
        onSky = Color.White,
        amber = if (darkTheme) Color(0xFFFBBF24) else Color(0xFFD97706),
        onAmber = Color.White,
        purple = if (darkTheme) Color(0xFFA78BFA) else Color(0xFF7C3AED),
        onPurple = Color.White,
        cardBorder = if (darkTheme) Color(0x1EFFFFFF) else Color(0x14000000)
    )

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    CompositionLocalProvider(LocalExpressiveColors provides customColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            shapes = ExpressiveShapes,
            typography = ExpressiveTypography,
            content = content
        )
    }
}
