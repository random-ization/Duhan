package com.hangyeol.app.compose.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hangyeol.app.compose.theme.HangyeolTheme

@Composable
fun KSoftSerifLabelStyle(): TextStyle =
  HangyeolTheme.typography.bodySmall.copy(
    fontFamily = FontFamily.Serif,
    fontSize = 12.sp,
    lineHeight = 15.sp,
    fontWeight = FontWeight.Medium,
    letterSpacing = 3.sp,
  )

@Composable
fun KSoftOverlineStyle(): TextStyle =
  HangyeolTheme.typography.bodySmall.copy(
    fontSize = 11.sp,
    lineHeight = 14.sp,
    fontWeight = FontWeight.Bold,
    letterSpacing = 1.8.sp,
  )

@Composable
fun KSoftHanjaSeal(
  c: String,
  size: Int = 40,
  color: Color = HangyeolTheme.colorScheme.surface,
  bg: Color = HangyeolTheme.extendedColors.crimson,
  round: Int = 8,
  modifier: Modifier = Modifier,
) {
  Surface(
    modifier = modifier.size(size.dp),
    color = bg,
    shape = RoundedCornerShape(round.dp),
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().heightIn(min = size.dp),
      contentAlignment = Alignment.Center,
    ) {
      Text(
        text = c,
        color = color,
        style =
          HangyeolTheme.typography.headlineMedium.copy(
            fontFamily = FontFamily.Serif,
            fontSize = (size * 0.5f).sp,
            lineHeight = (size * 0.5f).sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = (-1).sp,
          ),
      )
    }
  }
}

@Composable
fun KSoftChip(
  text: String,
  tone: String = "muted",
  size: String = "sm",
  modifier: Modifier = Modifier,
) {
  val palette =
    when (tone) {
      "pink" -> HangyeolTheme.extendedColors.tintPink to Color(0xFF7A2F26)
      "mint" -> HangyeolTheme.extendedColors.tintMint to Color(0xFF2F5847)
      "butter" -> HangyeolTheme.extendedColors.tintButter to Color(0xFF7A5F1F)
      "lilac" -> HangyeolTheme.extendedColors.tintLilac to Color(0xFF5A4985)
      "sky" -> HangyeolTheme.extendedColors.sky to Color(0xFF274D66)
      "crimson" -> HangyeolTheme.extendedColors.crimson to HangyeolTheme.colorScheme.surface
      "ink" -> HangyeolTheme.colorScheme.primary to HangyeolTheme.colorScheme.onPrimary
      else -> Color(0x0D1F1B17) to HangyeolTheme.extendedColors.subtext
    }
  val padding =
    if (size == "sm") {
      3.dp to 10.dp
    } else {
      6.dp to 13.dp
    }
  val fontSize = if (size == "sm") 10.sp else 11.sp
  Surface(
    modifier = modifier,
    color = palette.first,
    shape = RoundedCornerShape(999.dp),
  ) {
    Text(
      text = text,
      color = palette.second,
      style =
        HangyeolTheme.typography.labelSmall.copy(
          fontSize = fontSize,
          lineHeight = (fontSize.value * 1.2f).sp,
          fontWeight = FontWeight.SemiBold,
          letterSpacing = 0.4.sp,
        ),
      modifier = Modifier.padding(vertical = padding.first, horizontal = padding.second),
    )
  }
}

@Composable
fun KSoftSectionHead(
  kanji: String,
  title: String,
  action: String? = null,
  modifier: Modifier = Modifier,
) {
  Row(
    modifier = modifier.fillMaxWidth().padding(horizontal = 2.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.Bottom,
  ) {
    Row(
      horizontalArrangement = Arrangement.spacedBy(8.dp),
      verticalAlignment = Alignment.Bottom,
    ) {
      Text(
        text = kanji,
        color = HangyeolTheme.extendedColors.crimson.copy(alpha = 0.85f),
        style =
          HangyeolTheme.typography.bodyMedium.copy(
            fontFamily = FontFamily.Serif,
            fontSize = 16.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium,
          ),
      )
      Text(
        text = title,
        color = HangyeolTheme.colorScheme.onBackground,
        style =
          HangyeolTheme.typography.bodySmall.copy(
            fontSize = 13.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 0.3.sp,
          ),
      )
    }
    action?.let {
      Text(
        text = "$it →",
        color = HangyeolTheme.extendedColors.subtext,
        style =
          HangyeolTheme.typography.labelSmall.copy(
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.SemiBold,
          ),
      )
    }
  }
}

@Composable
fun KSoftStreakRow(
  done: Int,
  labels: List<String> = listOf("월", "화", "수", "목", "금", "토", "일"),
  modifier: Modifier = Modifier,
) {
  Row(
    modifier = modifier.fillMaxWidth(),
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    labels.forEachIndexed { index, label ->
      Column(
        modifier = Modifier.weight(1f),
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Surface(
          modifier = Modifier.size(38.dp),
          color = if (index < done) Color(0xFFC8DCCF) else Color(0x0D1F1B17),
          shape = RoundedCornerShape(12.dp),
        ) {
          Box(contentAlignment = Alignment.Center) {
            if (index < done) {
              Text(
                text = "✓",
                color = Color(0xFF2F5847),
                style =
                  HangyeolTheme.typography.bodySmall.copy(
                    fontSize = 13.sp,
                    lineHeight = 13.sp,
                    fontWeight = FontWeight.Bold,
                  ),
              )
            }
            if (index == done - 1) {
              Text(
                text = "🔥",
                style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 12.sp),
                modifier = Modifier.align(Alignment.TopEnd).offset(x = 3.dp, y = (-3).dp),
              )
            }
          }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = label,
          color = HangyeolTheme.extendedColors.subtext,
          style =
            HangyeolTheme.typography.labelSmall.copy(
              fontSize = 10.sp,
              lineHeight = 12.sp,
              fontWeight = FontWeight.SemiBold,
            ),
        )
      }
    }
  }
}

@Composable
fun KSoftBottomTab(
  icon: @Composable () -> Unit,
  label: String,
  active: Boolean = false,
  badge: Boolean = false,
  onPress: (() -> Unit)? = null,
  modifier: Modifier = Modifier,
) {
  val interactionSource = remember { MutableInteractionSource() }
  val pressed by interactionSource.collectIsPressedAsState()
  Column(
    modifier =
      modifier
        .clickable(
          enabled = onPress != null,
          interactionSource = interactionSource,
          indication = null,
        ) { onPress?.invoke() }
        .alpha(if (pressed) 0.72f else 1f)
        .padding(vertical = 4.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.spacedBy(4.dp),
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().height(26.dp),
      contentAlignment = Alignment.Center,
    ) {
      icon()
      if (badge) {
        Surface(
          modifier = Modifier.align(Alignment.TopEnd).offset(x = 4.dp, y = (-2).dp).size(8.dp),
          color = HangyeolTheme.extendedColors.crimson,
          shape = RoundedCornerShape(999.dp),
          border = BorderStroke(2.dp, HangyeolTheme.colorScheme.surface),
        ) {}
      }
    }
    Text(
      text = label,
      color = if (active) HangyeolTheme.colorScheme.primary else HangyeolTheme.extendedColors.subtextLight,
      maxLines = 1,
      style =
        HangyeolTheme.typography.labelSmall.copy(
          fontSize = 10.sp,
          lineHeight = 12.sp,
          fontWeight = if (active) FontWeight.ExtraBold else FontWeight.SemiBold,
        ),
    )
  }
}

@Composable
fun KSoftInputField(
  value: String,
  onValueChange: (String) -> Unit,
  placeholder: String,
  modifier: Modifier = Modifier,
  inputFieldModifier: Modifier = Modifier,
  leftIcon: (@Composable () -> Unit)? = null,
  rightIcon: (@Composable () -> Unit)? = null,
  errorText: String? = null,
  keyboardType: KeyboardType = KeyboardType.Text,
  obscureText: Boolean = false,
  imeAction: ImeAction = ImeAction.Default,
  onSubmit: (() -> Unit)? = null,
) {
  val focusManager = LocalFocusManager.current
  val keyboardController = LocalSoftwareKeyboardController.current
  var focused by remember { mutableStateOf(false) }
  val background =
    when {
      focused -> HangyeolTheme.colorScheme.surface
      else -> HangyeolTheme.extendedColors.surfaceMuted
    }
  val border =
    when {
      !errorText.isNullOrBlank() -> HangyeolTheme.extendedColors.crimson.copy(alpha = 0.53f)
      focused -> HangyeolTheme.colorScheme.primary
      else -> HangyeolTheme.extendedColors.lineStrong
    }
  Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
    Surface(
      color = background,
      shape = RoundedCornerShape(20.dp),
      border = BorderStroke(1.dp, border),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        leftIcon?.let {
          Box(contentAlignment = Alignment.Center) { it() }
          Spacer(modifier = Modifier.width(8.dp))
        }
        Box(modifier = Modifier.weight(1f)) {
          if (value.isBlank()) {
            Text(
              text = placeholder,
              color = HangyeolTheme.extendedColors.subtext,
              style =
                HangyeolTheme.typography.bodyLarge.copy(
                  fontSize = 15.sp,
                  lineHeight = 23.sp,
                  fontWeight = FontWeight.Medium,
                ),
            )
          }
          BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier =
              Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp)
                .background(Color.Transparent)
                .onFocusChanged { focused = it.isFocused }
                .then(inputFieldModifier),
            textStyle =
              HangyeolTheme.typography.bodyLarge.copy(
                color = HangyeolTheme.colorScheme.onSurface,
                fontSize = 15.sp,
                lineHeight = 23.sp,
                fontWeight = FontWeight.Medium,
              ),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
            keyboardActions =
              KeyboardActions(
                onDone = {
                  focusManager.clearFocus(force = true)
                  onSubmit?.invoke()
                  keyboardController?.hide()
                },
                onSearch = {
                  focusManager.clearFocus(force = true)
                  onSubmit?.invoke()
                  keyboardController?.hide()
                },
              ),
            visualTransformation = if (obscureText) PasswordVisualTransformation() else VisualTransformation.None,
            singleLine = true,
            onTextLayout = {},
            decorationBox = { innerTextField ->
              Box(
                modifier =
                  Modifier
                    .fillMaxWidth(),
              ) {
                innerTextField()
              }
            },
          )
        }
        rightIcon?.let {
          Spacer(modifier = Modifier.width(8.dp))
          Box(contentAlignment = Alignment.Center) { it() }
        }
      }
    }
    if (!errorText.isNullOrBlank()) {
      Text(
        text = errorText,
        color = HangyeolTheme.extendedColors.crimson,
        style =
          HangyeolTheme.typography.labelSmall.copy(
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.Medium,
          ),
      )
    }
  }
}

@Composable
fun KSoftPrimaryButton(
  text: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  enabled: Boolean = true,
  seal: String? = null,
  trailingArrow: Boolean = false,
) {
  Button(
    onClick = onClick,
    enabled = enabled,
    modifier = modifier.fillMaxWidth().height(56.dp),
    shape = RoundedCornerShape(28.dp),
    border =
      BorderStroke(
        1.dp,
        if (enabled) HangyeolTheme.colorScheme.primary else HangyeolTheme.extendedColors.lineSoft,
      ),
    colors =
      ButtonDefaults.buttonColors(
        containerColor = HangyeolTheme.colorScheme.primary,
        contentColor = HangyeolTheme.colorScheme.onPrimary,
        disabledContainerColor = HangyeolTheme.extendedColors.disabledBg,
        disabledContentColor = HangyeolTheme.extendedColors.disabledFg,
      ),
    contentPadding = ButtonDefaults.ContentPadding,
  ) {
    Row(
      modifier = Modifier,
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.Center,
    ) {
      Text(
        text = text,
        style =
          HangyeolTheme.typography.titleMedium.copy(
            fontSize = 15.sp,
            lineHeight = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 0.3.sp,
          ),
      )
      seal?.let {
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          text = it,
          style =
            HangyeolTheme.typography.labelSmall.copy(
              fontFamily = FontFamily.Serif,
              fontSize = 13.sp,
              lineHeight = 13.sp,
              fontWeight = FontWeight.Medium,
            ),
          color = HangyeolTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
        )
      }
      if (trailingArrow) {
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          text = "→",
          style =
            HangyeolTheme.typography.titleMedium.copy(
              fontSize = 16.sp,
              lineHeight = 16.sp,
              fontWeight = FontWeight.ExtraBold,
            ),
        )
      }
    }
  }
}

@Composable
fun KSoftSocialAuthButton(
  label: String,
  left: @Composable () -> Unit,
  onPress: () -> Unit,
  disabled: Boolean,
  modifier: Modifier = Modifier,
) {
  Surface(
    modifier = modifier.clickable(enabled = !disabled, onClick = onPress),
    shape = RoundedCornerShape(20.dp),
    color = HangyeolTheme.extendedColors.surfaceMuted,
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineStrong),
  ) {
    Row(
      modifier = Modifier.fillMaxWidth().height(52.dp).padding(horizontal = 18.dp),
      horizontalArrangement = Arrangement.Center,
      verticalAlignment = Alignment.CenterVertically,
    ) {
      Box(modifier = Modifier.padding(end = 10.dp)) { left() }
      Text(
        text = label,
        style =
          HangyeolTheme.typography.bodyMedium.copy(
            fontSize = 14.sp,
            lineHeight = 20.sp,
            fontWeight = FontWeight.Bold,
          ),
        color = HangyeolTheme.colorScheme.onSurface,
      )
    }
  }
}

@Composable
fun KSoftSurfaceCard(
  modifier: Modifier = Modifier,
  pad: Int = 20,
  tone: Color = HangyeolTheme.colorScheme.surface,
  content: @Composable () -> Unit,
) {
  Surface(
    modifier = modifier.shadow(10.dp, RoundedCornerShape(28.dp), clip = false),
    color = tone,
    shape = RoundedCornerShape(28.dp),
  ) {
    Box(modifier = Modifier.padding(pad.dp)) {
      content()
    }
  }
}

@Composable
fun KSoftDivider() {
  HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
}
