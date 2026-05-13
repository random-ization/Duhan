package com.hangyeol.app.compose.ui

import android.content.Intent
import android.net.Uri
import android.speech.tts.TextToSpeech
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hangyeol.app.compose.data.*
import com.hangyeol.app.compose.navigation.HangyeolDestination
import com.hangyeol.app.compose.state.*
import com.hangyeol.app.compose.theme.HangyeolTheme
import com.hangyeol.app.compose.ui.components.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontFamily
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.Locale

// ── AchievementsScreen ──────────────────────────────────────────────
@Composable
internal fun AchievementsScreen(onBack: () -> Unit) {
  val vm: AchievementsViewModel = viewModel(factory = AchievementsViewModel.factory(ComposeServiceLocator.contentRepository))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  LazyColumn(
    modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background)
      .statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(14.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
  ) {
    item { ParityBackRow(stringResource(R.string.parity_achievements_label), stringResource(R.string.parity_achievements), onBack) }
    if (ui.isLoading) { item { ParityLoadingCard(stringResource(R.string.parity_loading_achievements)) } }
    ui.errorMessage?.let { msg -> item { ParityErrorCard(msg) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      item {
        Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(22.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 3.dp,
          modifier = Modifier.fillMaxWidth()) {
          Column(modifier = Modifier.padding(20.dp)) {
            Text("${ui.unlockedCount} / ${ui.totalCount}", style = HangyeolTheme.typography.headlineMedium.copy(
              fontSize = 28.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
            Text(stringResource(R.string.parity_unlocked_achievements, ui.progressPct), style = HangyeolTheme.typography.bodySmall.copy(
              fontSize = 12.sp, fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 4.dp))
            Box(modifier = Modifier.fillMaxWidth().padding(top = 12.dp).height(6.dp)
              .background(HangyeolTheme.extendedColors.lineSoft, RoundedCornerShape(3.dp))) {
              Box(modifier = Modifier.fillMaxWidth(ui.progressPct / 100f).height(6.dp)
                .background(HangyeolTheme.colorScheme.primary, RoundedCornerShape(3.dp)))
            }
          }
        }
      }
      if (ui.sections.isEmpty()) { item { ParityEmptyCard(stringResource(R.string.parity_empty_achievements)) { vm.refresh() } } }
      ui.sections.forEach { section ->
        item { KSoftSectionHead(kanji = section.category.take(1).ifBlank { "★" }, title = "${section.title} (${section.unlockedCount}/${section.totalCount})") }
        items(section.badges) { badge ->
          Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, if (badge.isUnlocked) HangyeolTheme.colorScheme.primary.copy(alpha = .3f) else HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = if (badge.isUnlocked) 3.dp else 1.dp, modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
              Text(badge.icon.ifBlank { "🏅" }, style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 28.sp))
              Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                  Text(badge.title.ifBlank { badge.badgeId }, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface, maxLines = 1)
                  if (badge.isNew) { KSoftChip(text = "NEW", tone = "crimson", size = "sm") }
                }
                Text(badge.description, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp), color = HangyeolTheme.extendedColors.subtext, maxLines = 2, modifier = Modifier.padding(top = 2.dp))
                if (badge.targetValue > 0) {
                  val pct = (badge.progressValue.toFloat() / badge.targetValue).coerceIn(0f, 1f)
                  Box(modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(4.dp).background(HangyeolTheme.extendedColors.lineSoft, RoundedCornerShape(2.dp))) {
                    Box(modifier = Modifier.fillMaxWidth(pct).height(4.dp).background(if (badge.isUnlocked) HangyeolTheme.colorScheme.primary else HangyeolTheme.extendedColors.subtext.copy(alpha = .5f), RoundedCornerShape(2.dp)))
                  }
                  Text("${badge.progressValue}/${badge.targetValue} · +${badge.rewardXp} XP", style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp))
                }
              }
            }
          }
        }
      }
    }
  }
}

// ── VocabBookScreen ─────────────────────────────────────────────────
@Composable
internal fun VocabBookScreen(onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val vm: VocabBookViewModel = viewModel(factory = VocabBookViewModel.factory(ComposeServiceLocator.contentRepository))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  LazyColumn(
    modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background)
      .statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
  ) {
    item { ParityBackRow(stringResource(R.string.parity_vocab_book_label), stringResource(R.string.parity_vocab_book), onBack) }
    if (ui.isLoading) { item { ParityLoadingCard(stringResource(R.string.parity_loading_vocab_book)) } }
    ui.errorMessage?.let { msg -> item { ParityErrorCard(msg) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      item {
        Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(22.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 3.dp,
          modifier = Modifier.fillMaxWidth()) {
          Column(modifier = Modifier.padding(20.dp)) {
            Text("${ui.wordCount}", style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 36.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
            Text(stringResource(R.string.parity_vocab_recorded), style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 2.dp))
          }
        }
      }
      if (ui.modes.isEmpty()) { item { ParityEmptyCard(stringResource(R.string.parity_empty_modes)) { vm.refresh() } } }
      item { KSoftSectionHead(kanji = "練", title = stringResource(R.string.parity_practice_modes)) }
      items(ui.modes) { mode ->
        val toneColor = when (mode.tone) {
          "pink" -> HangyeolTheme.extendedColors.crimson; "mint" -> HangyeolTheme.colorScheme.secondary
          "butter" -> HangyeolTheme.extendedColors.gold; "lilac" -> HangyeolTheme.extendedColors.indigo
          else -> HangyeolTheme.extendedColors.subtext
        }
        Surface(modifier = Modifier.fillMaxWidth().clickable { onNavigateRoute(HangyeolDestination.VocabBookMode.createRoute(mode.key)) },
          color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 2.dp) {
          Row(modifier = Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(color = toneColor.copy(alpha = .12f), shape = RoundedCornerShape(14.dp), modifier = Modifier.size(48.dp)) {
              Box(contentAlignment = Alignment.Center) { Text(mode.seal, style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, fontWeight = FontWeight.Bold), color = toneColor) }
            }
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
              Text(mode.title, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
              Text(mode.subtitle, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 2.dp))
            }
            Text("→", style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.extendedColors.subtext)
          }
        }
      }
    }
  }
}

@Composable
internal fun VocabBookModeScreen(mode: String, onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val vm: VocabBookModeViewModel = viewModel(key = "vbm-$mode", factory = VocabBookModeViewModel.factory(ComposeServiceLocator.contentRepository, mode))
  val listVm: VocabBookListViewModel = viewModel(key = "vbl-$mode", factory = VocabBookListViewModel.factory(ComposeServiceLocator.contentRepository))
  val contentRepository = ComposeServiceLocator.contentRepository
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  val ui by vm.uiState.collectAsStateWithLifecycle()
  val listUi by listVm.uiState.collectAsStateWithLifecycle()
  val normalizedMode = remember(mode) { normalizeVocabBookMode(mode) }
  val supportsSpeech = normalizedMode == "listen" || normalizedMode == "dictation" || normalizedMode == "spelling"
  var cardIndex by remember { mutableIntStateOf(0) }
  var revealed by remember { mutableStateOf(false) }
  var isRecallMode by remember(mode) { mutableStateOf(normalizedMode != "listen") }
  var speechError by remember(mode) { mutableStateOf<String?>(null) }
  var ttsReady by remember(mode) { mutableStateOf(false) }
  var ttsEngine by remember(mode) { mutableStateOf<TextToSpeech?>(null) }
  var dictationInput by remember(mode, cardIndex) { mutableStateOf("") }
  var spellingInput by remember(mode, cardIndex) { mutableStateOf("") }
  var lastCheckMessage by remember(mode, cardIndex) { mutableStateOf<String?>(null) }
  var exportMode by remember(mode) { mutableStateOf("A4_DICTATION") }
  var exportShuffle by remember(mode) { mutableStateOf(false) }
  var exportStateMessage by remember(mode) { mutableStateOf<String?>(null) }
  var exportingPdf by remember(mode) { mutableStateOf(false) }
  var selectedCategory by remember(mode) { mutableStateOf("DUE") }
  var searchDraft by remember(mode) { mutableStateOf("") }
  var appliedSearch by remember(mode) { mutableStateOf("") }
  val items = if (listUi.items.isNotEmpty()) listUi.items else ui.items
  val total = items.size
  val safeIdx = if (total == 0) 0 else cardIndex.coerceIn(0, total - 1)
  val current = items.getOrNull(safeIdx)
  val canGoPrev = safeIdx > 0
  val canGoNext = safeIdx < total - 1
  val isLoading = ui.isLoading || (normalizedMode != "export" && listUi.isLoading && items.isEmpty())
  val activeError = ui.errorMessage ?: listUi.errorMessage
  val categoryChips =
    if (listUi.categories.isNotEmpty()) {
      listUi.categories
    } else {
      listOf(
        com.hangyeol.app.compose.data.VocabBookCategoryUiModel("DUE", R.string.vocab_category_due, listUi.dueCount),
        com.hangyeol.app.compose.data.VocabBookCategoryUiModel("UNLEARNED", R.string.vocab_category_unlearned, listUi.unlearnedCount),
        com.hangyeol.app.compose.data.VocabBookCategoryUiModel("MASTERED", R.string.vocab_category_mastered, listUi.masteredCount),
        com.hangyeol.app.compose.data.VocabBookCategoryUiModel("ALL", R.string.vocab_category_all, listUi.totalCount),
      )
    }

  LaunchedEffect(mode, selectedCategory, appliedSearch) {
    if (normalizedMode == "export") return@LaunchedEffect
    listVm.refresh(search = appliedSearch, category = selectedCategory)
    cardIndex = 0
    revealed = false
    dictationInput = ""
    spellingInput = ""
  }

  DisposableEffect(context, mode, supportsSpeech) {
    if (!supportsSpeech) {
      ttsReady = false
      ttsEngine?.shutdown()
      ttsEngine = null
      onDispose {}
    } else {
      var instance: TextToSpeech? = null
      val engine =
        TextToSpeech(context) { status ->
          val active = instance
          if (status != TextToSpeech.SUCCESS || active == null) {
            ttsReady = false
            speechError = stringResource(R.string.parity_tts_unavailable)
            return@TextToSpeech
          }
          val languageStatus = active.setLanguage(Locale.KOREAN)
          ttsReady =
            languageStatus != TextToSpeech.LANG_MISSING_DATA &&
              languageStatus != TextToSpeech.LANG_NOT_SUPPORTED
          if (!ttsReady) {
            speechError = stringResource(R.string.parity_tts_not_supported)
          }
        }
      instance = engine
      ttsEngine = engine
      onDispose {
        engine.stop()
        engine.shutdown()
        ttsEngine = null
        ttsReady = false
      }
    }
  }

  fun normalizeAnswer(value: String): String =
    value.trim().replace("\\s+".toRegex(), "").lowercase(Locale.ROOT)

  fun speakText(text: String, locale: Locale = Locale.KOREAN) {
    val normalized = text.trim()
    if (normalized.isBlank()) return
    val engine = ttsEngine
    if (engine == null || !ttsReady) {
      speechError = stringResource(R.string.parity_tts_not_ready)
      return
    }
    engine.language = locale
    engine.speak(normalized, TextToSpeech.QUEUE_FLUSH, null, "vocab-${System.currentTimeMillis()}")
    speechError = null
  }

  LaunchedEffect(normalizedMode, safeIdx, current?.word, ttsReady) {
    if (normalizedMode != "listen") return@LaunchedEffect
    val word = current?.word?.trim().orEmpty()
    if (word.isBlank() || !ttsReady) return@LaunchedEffect
    speakText(word, Locale.KOREAN)
  }

  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item { ParityBackRow("冊 · ${mode.uppercase()}", ui.title.ifBlank { stringResource(R.string.vocab_mode_title_fallback) }, onBack) }
    if (isLoading) { item { ParityLoadingCard(stringResource(R.string.parity_loading)) } }
    activeError?.let { m -> item { ParityErrorCard(m) { vm.refresh(); listVm.refresh(search = appliedSearch, category = selectedCategory) } } }
    if (!isLoading && activeError == null) {
      // ── Header: subtitle + mode toggle + progress ──
      item {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          if (ui.subtitle.isNotBlank()) { Text(ui.subtitle, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, fontWeight = FontWeight.Medium), color = HangyeolTheme.extendedColors.subtext) }
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            if (normalizedMode == "immersive") {
              Surface(modifier = Modifier.clickable { isRecallMode = !isRecallMode; revealed = false },
                color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
                Text(if (isRecallMode) stringResource(R.string.vocab_mode_browser) else stringResource(R.string.vocab_mode_recall_toggle), modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                  style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.primary)
              }
            }
            Text(if (total > 0) "${safeIdx + 1}/$total" else "0/0", style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
          }
        }
      }
      item {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          OutlinedTextField(
            value = searchDraft,
            onValueChange = { searchDraft = it },
            label = { Text(stringResource(R.string.vocab_mode_search_placeholder)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
          )
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
          ) {
            Button(
              onClick = {
                appliedSearch = searchDraft.trim()
                exportStateMessage = null
              },
              shape = RoundedCornerShape(12.dp),
              modifier = Modifier.weight(1f),
            ) {
              Text(stringResource(R.string.parity_apply_filter))
            }
            if (appliedSearch.isNotBlank()) {
              Button(
                onClick = {
                  searchDraft = ""
                  appliedSearch = ""
                  exportStateMessage = null
                },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f),
              ) {
                Text(stringResource(R.string.parity_clear))
              }
            }
          }
          LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(categoryChips) { chip ->
              val isActive = selectedCategory == chip.key
              Surface(
                modifier =
                  Modifier.clickable {
                    selectedCategory = chip.key
                    exportStateMessage = null
                  },
                color =
                  if (isActive) {
                    HangyeolTheme.extendedColors.tintMint
                  } else {
                    HangyeolTheme.colorScheme.surface
                  },
                shape = RoundedCornerShape(999.dp),
                border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              ) {
                Text(
                  "${stringResource(chip.labelRes)} ${chip.count}",
                  style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                )
              }
            }
          }
        }
      }
      // ── Empty state ──
      if (items.isEmpty()) { item { ParityEmptyCard(stringResource(R.string.vocab_mode_empty_due)) { vm.refresh(); listVm.refresh(search = appliedSearch, category = selectedCategory) } } }
      if (normalizedMode == "export") {
        item {
          Surface(
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Surface(
              modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
              color = HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(20.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)
            ) {
              Column(modifier = Modifier.padding(20.dp)) {
                Text(
                  stringResource(R.string.vocab_mode_export_title),
                  style = HangyeolTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.colorScheme.onSurface,
                )
                Text(
                  stringResource(R.string.vocab_mode_export_desc),
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 4.dp)
                )
                
                Spacer(modifier = Modifier.height(20.dp))
                
                // Format Selection
                Text(stringResource(R.string.vocab_mode_format), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
                Row(
                  modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                  horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                  listOf(
                    "A4_DICTATION" to stringResource(R.string.vocab_mode_export_dictation),
                    "LANG_LIST" to stringResource(R.string.vocab_mode_export_def),
                    "KO_LIST" to stringResource(R.string.vocab_mode_export_ko),
                  ).forEach { option ->
                    val selected = exportMode == option.first
                    Surface(
                      modifier = Modifier.weight(1f).clickable { exportMode = option.first },
                      color = if (selected) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.colorScheme.background,
                      shape = RoundedCornerShape(12.dp),
                      border = BorderStroke(1.dp, if (selected) HangyeolTheme.extendedColors.mint else HangyeolTheme.extendedColors.lineSoft),
                    ) {
                      Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(vertical = 12.dp)) {
                        Text(
                          option.second,
                          style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                          color = if (selected) HangyeolTheme.colorScheme.onSurface else HangyeolTheme.extendedColors.subtext,
                        )
                      }
                    }
                  }
                }

                Spacer(modifier = Modifier.height(16.dp))
                
                // Settings
                Text(stringResource(R.string.vocab_mode_settings), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
                Surface(
                  modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clickable { exportShuffle = !exportShuffle },
                  color = HangyeolTheme.colorScheme.background,
                  shape = RoundedCornerShape(12.dp),
                  border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                ) {
                  Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                      if (exportShuffle) stringResource(R.string.vocab_mode_export_shuffle_on) else stringResource(R.string.vocab_mode_export_shuffle_off),
                      style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.weight(1f)
                    )
                    Switch(checked = exportShuffle, onCheckedChange = { exportShuffle = it }, colors = SwitchDefaults.colors(checkedThumbColor = HangyeolTheme.extendedColors.mint))
                  }
                }

                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                  onClick = {
                    if (exportingPdf) return@Button
                    exportingPdf = true
                    exportStateMessage = null
                    scope.launch {
                      val result = contentRepository.exportVocabBookPdf(
                        category = selectedCategory,
                        mode = exportMode,
                        shuffle = exportShuffle,
                        query = appliedSearch.ifBlank { null },
                        language = java.util.Locale.getDefault().language,
                      )
                      exportingPdf = false
                      if (!result.success || result.url.isBlank()) {
                        exportStateMessage = result.errorMessage ?: context.getString(R.string.parity_export_failed)
                      } else {
                        exportStateMessage = context.getString(R.string.parity_export_success)
                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(result.url)))
                      }
                    }
                  },
                  enabled = !exportingPdf,
                  shape = RoundedCornerShape(16.dp),
                  modifier = Modifier.fillMaxWidth(),
                  colors = ButtonDefaults.buttonColors(containerColor = HangyeolTheme.colorScheme.onSurface)
                ) {
                  if (exportingPdf) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = HangyeolTheme.colorScheme.surface, strokeWidth = 2.dp)
                    Spacer(modifier = Modifier.width(12.dp))
                  }
                  Text(if (exportingPdf) stringResource(R.string.vocab_mode_export_generating) else stringResource(R.string.vocab_mode_export_cta), style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                }
                
                exportStateMessage?.takeIf { it.isNotBlank() }?.let { msg ->
                  Text(
                    msg,
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.Medium),
                    color = if (msg.contains("成功") || msg.contains("Success")) HangyeolTheme.extendedColors.mint else HangyeolTheme.extendedColors.crimson,
                    modifier = Modifier.padding(top = 12.dp).fillMaxWidth(),
                    textAlign = TextAlign.Center
                  )
                }
              }
            }
          }
        }
      }
      // ── Word card ──
      if (current != null && normalizedMode != "export") {
        item {
          Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(28.dp),
            border = BorderStroke(2.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 6.dp,
            modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(24.dp)) {
              Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(current.word, style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 32.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
                if (current.partOfSpeech.isNotBlank()) { KSoftChip(text = current.partOfSpeech, tone = "muted", size = "sm") }
                if (current.status == "MASTERED") { KSoftChip(text = stringResource(R.string.vocab_mode_mastered_badge), tone = "mint", size = "sm") }
              }
              if (current.pronunciation.isNotBlank()) { Text(current.pronunciation, style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp)) }
              if (normalizedMode == "immersive") {
                if (isRecallMode && !revealed) {
                  Surface(modifier = Modifier.fillMaxWidth().padding(top = 16.dp).clickable { revealed = true },
                    color = HangyeolTheme.extendedColors.lineSoft.copy(alpha = .5f), shape = RoundedCornerShape(18.dp)) {
                    Text(stringResource(R.string.vocab_mode_reveal_hint), modifier = Modifier.padding(20.dp), style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
                  }
                } else {
                  Text(current.meaning, style = HangyeolTheme.typography.bodyLarge.copy(fontSize = 18.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 16.dp))
                }
              } else {
                Text(
                  current.meaning,
                  style = HangyeolTheme.typography.bodyLarge.copy(fontSize = 18.sp, fontWeight = FontWeight.Bold),
                  color = HangyeolTheme.colorScheme.onSurface,
                  modifier = Modifier.padding(top = 16.dp),
                )
              }
              if (supportsSpeech) {
                Row(
                  modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                  horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                  Surface(
                    modifier = Modifier.weight(1f).clickable { speakText(current.word, Locale.KOREAN) },
                    color = HangyeolTheme.extendedColors.tintMint,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                  ) {
                    Text(
                      stringResource(R.string.vocab_mode_play_ko),
                      style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                      color = HangyeolTheme.colorScheme.onSurface,
                      modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    )
                  }
                  if (normalizedMode == "listen") {
                    Surface(
                      modifier = Modifier.weight(1f).clickable { speakText(current.meaning, Locale.CHINESE) },
                      color = HangyeolTheme.extendedColors.tintButter,
                      shape = RoundedCornerShape(12.dp),
                      border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
                    ) {
                      Text(
                        stringResource(R.string.vocab_mode_play_def),
                        style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                        color = HangyeolTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                      )
                    }
                  }
                }
              }
              if (normalizedMode == "dictation") {
                OutlinedTextField(
                  value = dictationInput,
                  onValueChange = {
                    dictationInput = it
                    lastCheckMessage = null
                  },
                  modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                  label = { Text(stringResource(R.string.vocab_mode_input_hint_dictation)) },
                  singleLine = true,
                )
                Button(
                  onClick = {
                    val expected = normalizeAnswer(current.word)
                    val actual = normalizeAnswer(dictationInput)
                    if (actual.isBlank()) {
                      lastCheckMessage = stringResource(R.string.vocab_mode_check_empty)
                    } else if (actual == expected) {
                      lastCheckMessage = stringResource(R.string.vocab_mode_check_dictation_correct)
                      if (current.status != "MASTERED") {
                        listVm.setMastery(current.id, true)
                      }
                      if (canGoNext) {
                        cardIndex = safeIdx + 1
                        dictationInput = ""
                        revealed = false
                      }
                    } else {
                      lastCheckMessage = stringResource(R.string.vocab_mode_check_dictation_incorrect, current.word)
                    }
                  },
                  shape = RoundedCornerShape(12.dp),
                  modifier = Modifier.padding(top = 10.dp),
                ) {
                  Text(stringResource(R.string.vocab_mode_check_cta))
                }
              }
              if (normalizedMode == "spelling") {
                val target = current.word.trim()
                val masked =
                  target.mapIndexed { index, ch ->
                    if (index == 0 || index == target.lastIndex) ch else '•'
                  }.joinToString("")
                Text(
                  stringResource(R.string.vocab_mode_spelling_hint, masked),
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 12.dp),
                )
                OutlinedTextField(
                  value = spellingInput,
                  onValueChange = {
                    spellingInput = it
                    lastCheckMessage = null
                  },
                  modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                  label = { Text(stringResource(R.string.vocab_mode_input_hint_spelling)) },
                  singleLine = true,
                )
                Button(
                  onClick = {
                    val guess = spellingInput
                    if (guess.isBlank()) {
                      lastCheckMessage = stringResource(R.string.vocab_mode_check_empty)
                    } else if (guess.trim() == current.word.trim()) {
                      lastCheckMessage = stringResource(R.string.vocab_mode_check_spelling_correct)
                      if (current.status != "MASTERED") {
                        listVm.setMastery(current.id, true)
                      }
                      if (canGoNext) {
                        cardIndex = safeIdx + 1
                        spellingInput = ""
                        revealed = false
                      }
                    } else {
                      lastCheckMessage = stringResource(R.string.vocab_mode_check_spelling_incorrect, current.word)
                    }
                  },
                  shape = RoundedCornerShape(12.dp),
                  modifier = Modifier.padding(top = 10.dp),
                ) {
                  Text(stringResource(R.string.vocab_mode_check_spelling_cta))
                }
              }
              lastCheckMessage?.takeIf { it.isNotBlank() }?.let { message ->
                Text(
                  message,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp),
                  color = HangyeolTheme.extendedColors.subtext,
                  modifier = Modifier.padding(top = 8.dp),
                )
              }
              speechError?.takeIf { it.isNotBlank() }?.let { error ->
                Text(
                  error,
                  style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp),
                  color = HangyeolTheme.extendedColors.crimson,
                  modifier = Modifier.padding(top = 8.dp),
                )
              }
            }
          }
        }
        // ── Navigation + mastery controls ──
        item {
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.clickable {
              if (!canGoPrev) return@clickable
              cardIndex = safeIdx - 1
              revealed = false
            },
              color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(16.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 2.dp) {
              Text(stringResource(R.string.vocab_mode_prev), modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
            }
            Surface(modifier = Modifier.clickable {
              if (current.status != "MASTERED") { listVm.setMastery(current.id, true) }
              if (safeIdx < total - 1) { cardIndex = safeIdx + 1; revealed = false }
            }, color = HangyeolTheme.colorScheme.primary, shape = RoundedCornerShape(16.dp), shadowElevation = 2.dp) {
              Text(stringResource(R.string.vocab_mode_master_action), modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onPrimary)
            }
            Surface(modifier = Modifier.clickable {
              if (!canGoNext) return@clickable
              cardIndex = safeIdx + 1
              revealed = false
            },
              color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(16.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 2.dp) {
              Text(stringResource(R.string.vocab_mode_next), modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
            }
          }
        }
      }
      // ── Word list below card ──
      if (items.size > 1) {
        item { KSoftSectionHead(kanji = "目", title = stringResource(R.string.vocab_list_count, items.size)) }
        itemsIndexed(items) { idx, w ->
          Surface(modifier = Modifier.fillMaxWidth().clickable { cardIndex = idx; revealed = false },
            color = if (idx == safeIdx) HangyeolTheme.colorScheme.primary.copy(alpha = .06f) else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, if (idx == safeIdx) HangyeolTheme.colorScheme.primary.copy(alpha = .3f) else HangyeolTheme.extendedColors.lineSoft)) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
              Column(modifier = Modifier.weight(1f)) {
                Text(w.word, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
                if (w.pronunciation.isNotBlank()) { Text(w.pronunciation, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp), color = HangyeolTheme.extendedColors.subtext) }
              }
              Text(w.meaning, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(start = 8.dp))
            }
          }
        }
      }
      if (normalizedMode != "export" && listUi.nextCursor != null) {
        item {
          Button(
            onClick = { listVm.loadMore(search = appliedSearch, category = selectedCategory) },
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth(),
          ) {
            Text(stringResource(R.string.parity_load_more))
          }
        }
      }
    }
  }
}

private fun normalizeVocabBookMode(raw: String): String {
  val normalized = raw.trim().lowercase(Locale.ROOT)
  return when (normalized) {
    "immersive", "immerse" -> "immersive"
    "listen" -> "listen"
    "dictation" -> "dictation"
    "spelling" -> "spelling"
    "export", "export-pdf" -> "export"
    else -> normalized
  }
}

@Composable
internal fun TypingScreen(onBack: () -> Unit) {
  val vm: TypingViewModel = viewModel(factory = TypingViewModel.factory(ComposeServiceLocator.contentRepository))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  var selectedTextIdx by remember { mutableIntStateOf(-1) }
  var typedText by remember { mutableStateOf("") }
  var isPlaying by remember { mutableStateOf(false) }
  var startTimeMs by remember { mutableLongStateOf(0L) }
  val scope = rememberCoroutineScope()

  // ── Playing mode: typing practice ──
  if (isPlaying && selectedTextIdx >= 0) {
    val target = ui.texts.getOrNull(selectedTextIdx)
    if (target != null) {
      val targetContent = target.content
      val correctCount = typedText.indices.count { i -> i < targetContent.length && typedText[i] == targetContent[i] }
      val accuracy = if (typedText.isNotEmpty()) (correctCount * 100 / typedText.length) else 100
      val elapsedSec = if (startTimeMs > 0) ((System.currentTimeMillis() - startTimeMs) / 1000f).coerceAtLeast(1f) else 1f
      val wpm = ((typedText.length / 5f) / (elapsedSec / 60f)).toInt()
      val isComplete = typedText.length >= targetContent.length

      LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { ParityBackRow("鍵 · TYPING", target.title, { isPlaying = false; typedText = "" }) }
        // ── Live stats ──
        item {
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(stringResource(R.string.typing_stat_speed) to "$wpm WPM", stringResource(R.string.typing_stat_accuracy) to "$accuracy%", stringResource(R.string.typing_stat_count) to "${typedText.length}/${targetContent.length}").forEach { (seal, value) ->
              Surface(modifier = Modifier.weight(1f), color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                  Text(seal, style = KSoftSerifLabelStyle(), color = HangyeolTheme.colorScheme.secondary)
                  Text(value, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                }
              }
            }
          }
        }
        // ── Target text with character highlighting ──
        item {
          Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(22.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(20.dp)) {
              Text(stringResource(R.string.typing_target_text), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp), color = HangyeolTheme.extendedColors.subtext)
              Text(targetContent, style = HangyeolTheme.typography.bodyLarge.copy(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Medium), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 8.dp))
            }
          }
        }
        // ── Text input ──
        item {
          OutlinedTextField(value = typedText, onValueChange = { v ->
            if (startTimeMs == 0L) startTimeMs = System.currentTimeMillis()
            typedText = v
          }, modifier = Modifier.fillMaxWidth().heightIn(min = 100.dp),
            label = { Text(stringResource(R.string.typing_input_hint)) }, shape = RoundedCornerShape(18.dp),
            textStyle = HangyeolTheme.typography.bodyLarge.copy(fontSize = 16.sp, lineHeight = 24.sp))
        }
        // ── Complete state ──
        if (isComplete) {
          item {
            Surface(color = HangyeolTheme.colorScheme.primary.copy(alpha = .08f), shape = RoundedCornerShape(18.dp),
              border = BorderStroke(1.dp, HangyeolTheme.colorScheme.primary.copy(alpha = .3f)), modifier = Modifier.fillMaxWidth()) {
              Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.typing_completed), style = HangyeolTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.primary)
                Text(stringResource(R.string.typing_result_summary, wpm, accuracy), style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp))
                Surface(modifier = Modifier.padding(top = 12.dp).clickable {
                  scope.launch {
                    vm.saveRecord(com.hangyeol.app.compose.data.TypingRecordPayload(
                      practiceMode = "SENTENCE", categoryId = target.category, wpm = wpm, accuracy = accuracy,
                      errorCount = typedText.length - correctCount, duration = elapsedSec.toInt(),
                      charactersTyped = typedText.length, sentencesCompleted = 1, targetWpm = 60, isTargetAchieved = wpm >= 60))
                  }
                  isPlaying = false; typedText = ""; startTimeMs = 0L; vm.refresh()
                }, color = HangyeolTheme.colorScheme.primary, shape = RoundedCornerShape(14.dp)) {
                  Text(stringResource(R.string.typing_save_and_return), modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onPrimary)
                }
              }
            }
          }
        }
      }
      return
    }
  }

  // ── Lobby mode: stats + text selection ──
  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
    item { ParityBackRow(stringResource(R.string.typing_label), stringResource(R.string.typing_title), onBack) }
    if (ui.isLoading) { item { ParityLoadingCard(stringResource(R.string.typing_loading)) } }
    ui.errorMessage?.let { m -> item { ParityErrorCard(m) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      // ── Stats card ──
      item {
        Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(22.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
          Column(modifier = Modifier.padding(20.dp)) {
            Text(stringResource(R.string.typing_progress_label), style = KSoftSerifLabelStyle(), color = HangyeolTheme.colorScheme.secondary)
            if (ui.stats != null) {
              val s = ui.stats!!
              Text(stringResource(R.string.typing_personal_best), style = HangyeolTheme.typography.titleMedium.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 6.dp))
              Row(modifier = Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("速" to "${s.highestWpm}" to stringResource(R.string.typing_highest_wpm), "均" to "${s.averageWpm}" to stringResource(R.string.typing_average), "精" to "${s.averageAccuracy}%" to stringResource(R.string.typing_accuracy_label)).forEach { (sv, label) ->
                  val (seal, value) = sv
                  Surface(modifier = Modifier.weight(1f), color = HangyeolTheme.extendedColors.lineSoft.copy(alpha = .3f), shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                      Text(seal, style = KSoftSerifLabelStyle(), color = HangyeolTheme.colorScheme.secondary)
                      Text(value, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                      Text(label, style = HangyeolTheme.typography.labelSmall.copy(fontSize = 9.sp, fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 2.dp))
                    }
                  }
                }
              }
              Row(modifier = Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stringResource(R.string.typing_sessions_week, s.sessionsThisWeek), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
                Text(stringResource(R.string.typing_sessions_total, s.totalTests), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
              }
            } else {
              Text(stringResource(R.string.typing_empty_stats), style = HangyeolTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 8.dp))
            }
          }
        }
      }
      // ── Text list ──
      if (ui.items.isEmpty()) { item { ParityEmptyCard(stringResource(R.string.typing_empty)) { vm.refresh() } } }
      else {
        item { KSoftSectionHead(kanji = "文", title = stringResource(R.string.typing_text_list, ui.texts.size)) }
        itemsIndexed(ui.texts) { idx, text ->
          Surface(modifier = Modifier.fillMaxWidth().clickable { selectedTextIdx = idx; isPlaying = true; typedText = ""; startTimeMs = 0L },
            color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 2.dp) {
            Row(modifier = Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
              Column(modifier = Modifier.weight(1f)) {
                Text(text.title, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
                Text(text.content.take(60) + if (text.content.length > 60) "…" else "", style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp), color = HangyeolTheme.extendedColors.subtext, maxLines = 2, modifier = Modifier.padding(top = 4.dp))
              }
              Text("→", style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(start = 8.dp))
            }
          }
        }
      }
    }
  }
}

@Composable
internal fun EpubReaderScreen(slug: String, onBack: () -> Unit) {
  val vm: EpubReaderViewModel = viewModel(key = "epub-$slug", factory = EpubReaderViewModel.factory(ComposeServiceLocator.contentRepository, slug))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  val currentPageIndex by vm.currentPageIndex.collectAsStateWithLifecycle()
  val contentRepository = ComposeServiceLocator.contentRepository
  val scope = rememberCoroutineScope()
  val page = ui.pages.getOrNull(currentPageIndex)
  val maxPageIndex = (ui.totalPages - 1).coerceAtLeast(0)
  val canGoPrev = currentPageIndex > 0
  val canGoNext = currentPageIndex < maxPageIndex
  var revealedTranslations by remember(slug, currentPageIndex) { mutableStateOf(emptySet<Int>()) }
  var lookupWord by remember(slug) { mutableStateOf("") }
  var lookupMeaning by remember(slug) { mutableStateOf("") }
  var lookupError by remember(slug) { mutableStateOf<String?>(null) }
  var lookupSuccess by remember(slug) { mutableStateOf<String?>(null) }
  var isLookupDialogOpen by remember(slug) { mutableStateOf(false) }
  var isLookupLoading by remember(slug) { mutableStateOf(false) }
  var isSavingWord by remember(slug) { mutableStateOf(false) }
  var isAddingToReview by remember(slug) { mutableStateOf(false) }

  LaunchedEffect(currentPageIndex, ui.sourceBookId, ui.totalPages, ui.isLoading, ui.errorMessage) {
    if (!ui.isLoading && ui.errorMessage == null) {
      vm.saveReadingProgress()
    }
  }

  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    item { ParityBackRow("冊 · READER", ui.title.ifBlank { stringResource(R.string.article_title) }, onBack) }
    if (ui.isLoading) { item { ParityLoadingCard("加载中") } }
    ui.errorMessage?.let { m -> item { ParityErrorCard(m) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      item {
        Surface(
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(20.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          modifier = Modifier.fillMaxWidth(),
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
          ) {
            Text(
              page?.title ?: "阅读页",
              style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.weight(1f),
            )
            Text(
              "${currentPageIndex + 1}/${ui.totalPages.coerceAtLeast(1)}",
              style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
              color = HangyeolTheme.extendedColors.subtext,
            )
          }
        }
      }

      if (page == null) {
        item { ParityEmptyCard("该页内容暂不可用") { vm.refresh() } }
      } else {
        if (page.paragraphs.isEmpty()) {
          item { ParityEmptyCard("该页暂无正文") { vm.refresh() } }
        } else {
          itemsIndexed(page.paragraphs) { paragraphIndex, paragraph ->
            Surface(
              color = HangyeolTheme.colorScheme.surface,
              shape = RoundedCornerShape(18.dp),
              border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
              modifier = Modifier.fillMaxWidth(),
            ) {
              Column(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
              ) {
                Text(
                  paragraph.text,
                  style = HangyeolTheme.typography.bodyMedium.copy(lineHeight = 26.sp),
                  color = HangyeolTheme.colorScheme.onSurface,
                )
                val hasTranslation = paragraph.translation.isNotBlank()
                if (hasTranslation) {
                  val revealed = revealedTranslations.contains(paragraphIndex)
                  Text(
                    if (revealed) paragraph.translation else stringResource(R.string.parity_reading_reveal_translation),
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 20.sp),
                    color = if (revealed) HangyeolTheme.extendedColors.subtext else HangyeolTheme.colorScheme.primary,
                    modifier = Modifier.clickable {
                      revealedTranslations = if (revealed) {
                        revealedTranslations - paragraphIndex
                      } else {
                        revealedTranslations + paragraphIndex
                      }
                    },
                  )
                }

                val lookupTokens = extractLookupTokens(paragraph.text)
                if (lookupTokens.isNotEmpty()) {
                  LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                  ) {
                    items(lookupTokens) { token ->
                      KSoftChip(
                        text = token,
                        tone = "muted",
                        size = "sm",
                        modifier = Modifier.clickable {
                          lookupWord = token
                          lookupMeaning = ""
                          lookupError = null
                          lookupSuccess = null
                          isLookupDialogOpen = true
                          isLookupLoading = true
                          scope.launch {
                            try {
                              val result = contentRepository.searchDictionary(token)
                              val first = result.entries.firstOrNull()
                              lookupMeaning =
                                first?.meaningZh?.takeIf { it.isNotBlank() }
                                  ?: first?.meaningKo?.takeIf { it.isNotBlank() }
                                  ?: first?.examples?.firstOrNull()?.takeIf { it.isNotBlank() }
                                  ?: "暂未查到释义"
                              lookupError = result.errorMessage
                            } catch (throwable: Throwable) {
                              lookupMeaning = ""
                              lookupError = throwable.message ?: stringResource(R.string.parity_dictionary_error)
                            } finally {
                              isLookupLoading = false
                            }
                          }
                        },
                      )
                    }
                  }
                }
              }
            }
          }
        }
      }

      item {
        Row(
          modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
          horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
          Button(
            onClick = { vm.setCurrentPage(currentPageIndex - 1) },
            enabled = canGoPrev,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.weight(1f),
            colors = ButtonDefaults.buttonColors(
              containerColor = HangyeolTheme.colorScheme.surface,
              contentColor = HangyeolTheme.colorScheme.onSurface,
              disabledContainerColor = HangyeolTheme.extendedColors.lineSoft.copy(alpha = 0.45f),
              disabledContentColor = HangyeolTheme.extendedColors.subtext,
            ),
          ) { Text(stringResource(R.string.parity_prev_page)) }
          Button(
            onClick = { vm.setCurrentPage(currentPageIndex + 1) },
            enabled = canGoNext,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.weight(1f),
            colors = ButtonDefaults.buttonColors(
              containerColor = HangyeolTheme.colorScheme.primary,
              contentColor = HangyeolTheme.colorScheme.onPrimary,
              disabledContainerColor = HangyeolTheme.extendedColors.lineSoft.copy(alpha = 0.45f),
              disabledContentColor = HangyeolTheme.extendedColors.subtext,
            ),
          ) { Text(stringResource(R.string.parity_next_page)) }
        }
      }
    }
  }

  if (isLookupDialogOpen) {
    AlertDialog(
      onDismissRequest = { isLookupDialogOpen = false },
      confirmButton = {
        TextButton(
          enabled = !isLookupLoading && !isSavingWord && !isAddingToReview && lookupWord.isNotBlank() && lookupMeaning.isNotBlank(),
          onClick = {
            isAddingToReview = true
            scope.launch {
              val result = contentRepository.addWordToReview(
                word = lookupWord,
                meaning = lookupMeaning,
                context = page?.paragraphs?.firstOrNull { it.text.contains(lookupWord) }?.text,
                source = "ANDROID_READING_DICTIONARY",
              )
              if (!result.success) {
                lookupError = result.errorMessage ?: stringResource(R.string.parity_review_add_error)
              } else {
                lookupError = null
                lookupSuccess = stringResource(R.string.parity_review_add_success)
              }
              isAddingToReview = false
            }
          },
        ) {
          Text(if (isAddingToReview) stringResource(R.string.parity_review_adding) else stringResource(R.string.vocab_review_add))
        }
      },
      dismissButton = {
        TextButton(onClick = { isLookupDialogOpen = false }) {
          Text(stringResource(R.string.parity_close))
        }
      },
      title = { Text(if (lookupWord.isBlank()) "词典" else lookupWord) },
      text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          if (isLookupLoading) {
            Text(stringResource(R.string.parity_dictionary_loading))
          } else {
            Text(lookupMeaning.ifBlank { stringResource(R.string.parity_dictionary_not_found) })
          }
          TextButton(
            enabled = !isLookupLoading && !isSavingWord && lookupWord.isNotBlank() && lookupMeaning.isNotBlank(),
            onClick = {
              isSavingWord = true
              scope.launch {
                val result = contentRepository.saveSavedWord(korean = lookupWord, english = lookupMeaning)
                if (!result.success) {
                  lookupError = result.errorMessage ?: stringResource(R.string.parity_notebook_save_error)
                } else {
                  lookupError = null
                  lookupSuccess = stringResource(R.string.parity_notebook_save_success)
                }
                isSavingWord = false
              }
            },
          ) {
            Text(if (isSavingWord) stringResource(R.string.parity_notebook_saving) else stringResource(R.string.vocab_notebook_save_short))
          }
          lookupError?.takeIf { it.isNotBlank() }?.let { msg ->
            Text(msg, color = HangyeolTheme.extendedColors.crimson)
          }
          lookupSuccess?.takeIf { it.isNotBlank() }?.let { msg ->
            Text(msg, color = HangyeolTheme.colorScheme.secondary)
          }
        }
      },
    )
  }
}

@Composable
internal fun VideoDetailScreen(videoId: String, onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val vm: VideoDetailViewModel = viewModel(key = "video-$videoId", factory = VideoDetailViewModel.factory(ComposeServiceLocator.contentRepository, videoId))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  var playbackUnlocked by remember(videoId) { mutableStateOf(false) }
  var playbackError by remember(videoId) { mutableStateOf<String?>(null) }
  val player = remember(videoId) {
    ExoPlayer.Builder(context).build().apply {
      playWhenReady = false
    }
  }

  DisposableEffect(player) {
    val listener = object : Player.Listener {
      override fun onIsPlayingChanged(isPlaying: Boolean) {
        if (!isPlaying || playbackUnlocked || videoId.isBlank()) return
        player.pause()
        scope.launch {
          val gate = vm.consumeMediaPlay("video:$videoId")
          if (gate.success) {
            playbackUnlocked = true
            playbackError = null
            player.play()
          } else {
            playbackError = gate.errorMessage ?: "播放次数已达上限，请升级后继续。"
          }
        }
      }
    }
    player.addListener(listener)
    onDispose {
      player.removeListener(listener)
      player.release()
    }
  }

  LaunchedEffect(ui.videoUrl) {
    if (ui.videoUrl.isBlank()) return@LaunchedEffect
    player.setMediaItem(MediaItem.fromUri(ui.videoUrl))
    player.prepare()
  }

  LaunchedEffect(player, playbackUnlocked, ui.videoUrl, ui.durationSec) {
    if (ui.videoUrl.isBlank()) return@LaunchedEffect
    while (true) {
      delay(10_000)
      if (!playbackUnlocked || !player.isPlaying) continue
      val progressSec = (player.currentPosition / 1000L).toInt().coerceAtLeast(0)
      val durationSec = player.duration.takeIf { it > 0L }?.let { (it / 1000L).toInt() } ?: ui.durationSec.takeIf { it > 0 }
      vm.saveProgress(progressSec = progressSec, durationSec = durationSec)
    }
  }

  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
    item { ParityBackRow("映 · VIDEO", ui.title.ifBlank { stringResource(R.string.dashboard_step_video_title) }, onBack) }
    if (ui.isLoading) { item { ParityLoadingCard("加载中") } }
    ui.errorMessage?.let { m -> item { ParityErrorCard(m) { vm.refresh() } } }
    if (ui.requiresUpgrade) { item { ParityErrorCard("需要升级订阅才能观看") {} } }
    playbackError?.let { m -> item { ParityErrorCard(m) {} } }
    if (!ui.isLoading && ui.errorMessage == null && !ui.requiresUpgrade) {
      if (ui.videoUrl.isNotBlank()) {
        item {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(18.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          ) {
            AndroidView(
              factory = { playerContext ->
                PlayerView(playerContext).apply {
                  this.player = player
                  useController = true
                }
              },
              update = { it.player = player },
              modifier = Modifier.fillMaxWidth().height(220.dp),
            )
          }
        }
      }
      if (ui.durationLabel.isNotBlank()) { item { KSoftChip(text = ui.durationLabel, tone = "muted", size = "sm") } }
      if (ui.description.isNotBlank()) { item { Text(ui.description, style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext) } }
      if (ui.transcriptLines.isNotEmpty()) {
        item { KSoftSectionHead(kanji = "字", title = "字幕") }
        items(ui.transcriptLines) { line -> Text(line, style = HangyeolTheme.typography.bodyMedium.copy(lineHeight = 24.sp), color = HangyeolTheme.colorScheme.onSurface) }
      }
    }
  }
}

// ── WritingEvaluationScreen ─────────────────────────────────────────
@Composable
internal fun WritingEvaluationScreen(sessionId: String, onBack: () -> Unit) {
  val vm: WritingEvaluationViewModel = viewModel(key = "eval-$sessionId", factory = WritingEvaluationViewModel.factory(ComposeServiceLocator.contentRepository, sessionId))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)) {
    item { ParityBackRow("評 · EVALUATION", stringResource(R.string.evaluation_title), onBack) }
    if (ui.isLoading) { item { ParityLoadingCard(stringResource(R.string.evaluation_loading)) } }
    ui.errorMessage?.let { msg -> item { ParityErrorCard(msg) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      item {
        Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(22.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
          Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("${ui.totalScore} / ${ui.totalMaxScore}", style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 36.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
            val pct = if (ui.totalMaxScore > 0) ui.totalScore * 100 / ui.totalMaxScore else 0
            Text(stringResource(R.string.typing_accuracy, ui.accuracyPct), style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp))
            Box(modifier = Modifier.fillMaxWidth().padding(top = 12.dp).height(6.dp).background(HangyeolTheme.extendedColors.lineSoft, RoundedCornerShape(3.dp))) {
              Box(modifier = Modifier.fillMaxWidth(pct / 100f).height(6.dp).background(HangyeolTheme.colorScheme.primary, RoundedCornerShape(3.dp)))
            }
          }
        }
      }
      if (ui.sections.isEmpty()) { item { ParityEmptyCard(stringResource(R.string.grammar_empty)) { vm.refresh() } } }
      ui.questions.forEach { q ->
        item { KSoftSectionHead(kanji = q.questionKey.take(2).ifBlank { "Q" }, title = "${q.questionLabel} (${q.score}/${q.maxScore})") }
        if (q.dimensions.isNotEmpty()) {
          item {
            Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
              Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                q.dimensions.forEach { dim ->
                  Column {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                      Text(dim.name, style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
                      Text("${dim.score}/${dim.maxScore}", style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.subtext)
                    }
                    val dimPct = if (dim.maxScore > 0) dim.score.toFloat() / dim.maxScore else 0f
                    Box(modifier = Modifier.fillMaxWidth().padding(top = 4.dp).height(4.dp).background(HangyeolTheme.extendedColors.lineSoft, RoundedCornerShape(2.dp))) {
                      Box(modifier = Modifier.fillMaxWidth(dimPct).height(4.dp).background(HangyeolTheme.colorScheme.primary, RoundedCornerShape(2.dp)))
                    }
                    if (dim.feedback.isNotBlank()) { Text(dim.feedback, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 16.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp)) }
                  }
                }
              }
            }
          }
        }
        if (q.feedbackText.isNotBlank()) {
          item {
            Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
              Column(modifier = Modifier.padding(16.dp)) {
                Text(stringResource(R.string.evaluation_ai_feedback), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp), color = HangyeolTheme.extendedColors.subtext)
                Text(q.feedbackText, style = HangyeolTheme.typography.bodyMedium.copy(lineHeight = 22.sp), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 8.dp))
              }
            }
          }
        }
        if (q.originalText.isNotBlank() && q.correctedText.isNotBlank()) {
          item {
            Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
              Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Column {
                  Text(stringResource(R.string.evaluation_original_text), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp), color = HangyeolTheme.extendedColors.subtext)
                  Text(q.originalText, style = HangyeolTheme.typography.bodyMedium.copy(lineHeight = 22.sp), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                }
                HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
                Column {
                  Text(stringResource(R.string.evaluation_corrected_text), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp), color = HangyeolTheme.colorScheme.secondary)
                  Text(q.correctedText, style = HangyeolTheme.typography.bodyMedium.copy(lineHeight = 22.sp), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
                }
              }
            }
          }
        }
      }
    }
  }
}

// ── PodcastSubscriptionsScreen ─────────────────────────────────────
@Composable
internal fun PodcastSubscriptionsScreen(onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val vm: PodcastSubscriptionsViewModel = viewModel(factory = PodcastSubscriptionsViewModel.factory(ComposeServiceLocator.contentRepository))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)) {
    item { ParityBackRow("訂 · SUBSCRIPTIONS", stringResource(R.string.podcast_subscriptions_title), onBack) }
    if (ui.isLoading) { item { ParityLoadingCard("加载订阅列表") } }
    ui.errorMessage?.let { msg -> item { ParityErrorCard(msg) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      if (ui.subscriptions.isEmpty()) { item { ParityEmptyCard("暂无订阅的播客频道") { vm.refresh() } } }
      item { KSoftSectionHead(kanji = "訂", title = "已订阅 (${ui.subscriptions.size})") }
      items(ui.subscriptions) { sub ->
        Surface(modifier = Modifier.fillMaxWidth().clickable { onNavigateRoute(HangyeolDestination.PodcastChannel.createRoute(channelId = sub.channelId)) },
          color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 2.dp) {
          Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.size(48.dp), color = HangyeolTheme.extendedColors.indigo.copy(alpha = .12f), shape = RoundedCornerShape(14.dp)) {
              Box(contentAlignment = Alignment.Center) { Text("聲", style = HangyeolTheme.typography.titleMedium.copy(fontSize = 20.sp, fontWeight = FontWeight.Medium), color = HangyeolTheme.extendedColors.indigo) }
            }
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
              Text(sub.title, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface, maxLines = 1)
              if (sub.author.isNotBlank()) { Text(sub.author, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp), color = HangyeolTheme.extendedColors.subtext, maxLines = 1, modifier = Modifier.padding(top = 2.dp)) }
            }
            Surface(modifier = Modifier.clickable { vm.toggleSubscription(sub.itunesId, sub.title, sub.author, sub.feedUrl, sub.artworkUrl) },
              color = HangyeolTheme.extendedColors.crimson.copy(alpha = .1f), shape = RoundedCornerShape(999.dp)) {
              Text(stringResource(R.string.podcast_unsubscribe), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.extendedColors.crimson, modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp))
            }
          }
        }
      }
    }
  }
}

// ── SubscriptionDetailScreen ───────────────────────────────────────
@Composable
internal fun SubscriptionDetailScreen(onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val vm: SubscriptionDetailViewModel = viewModel(factory = SubscriptionDetailViewModel.factory(ComposeServiceLocator.contentRepository))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  var checkingOut by remember { mutableStateOf(false) }
  var selectedInterval by remember { mutableStateOf("monthly") }
  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)) {
    item { ParityBackRow("會 · SUBSCRIPTION", stringResource(R.string.subscription_title), onBack) }
    if (ui.isLoading) { item { ParityLoadingCard(stringResource(R.string.subscription_loading)) } }
    ui.errorMessage?.let { msg -> item { ParityErrorCard(msg) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      item {
        Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(22.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
          Column(modifier = Modifier.padding(20.dp)) {
            Text(ui.planName.ifBlank { stringResource(R.string.subscription_free_plan) }, style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 26.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
            if (ui.status.isNotBlank()) { KSoftChip(text = ui.status, tone = if (ui.isMember) "mint" else "muted", size = "sm", modifier = Modifier.padding(top = 8.dp)) }
            if (ui.nextBillingDate.isNotBlank()) { Text(stringResource(R.string.subscription_next_billing, ui.nextBillingDate), style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 8.dp)) }
          }
        }
      }
      if (!ui.isMember) {
        item {
          Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("monthly" to stringResource(R.string.subscription_monthly), "annual" to stringResource(R.string.subscription_annual)).forEach { (key, label) ->
              Surface(modifier = Modifier.weight(1f).clickable { selectedInterval = key },
                color = if (selectedInterval == key) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.colorScheme.surface,
                shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                  Text(label, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
                  Text(if (key == "monthly") ui.monthlyPrice.ifBlank { "--" } else ui.annualPrice.ifBlank { "--" },
                    style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp))
                }
              }
            }
          }
        }
        item {
          Button(onClick = {
            if (checkingOut) return@Button
            checkingOut = true
            scope.launch {
              val result = vm.createCheckout(plan = "pro", billingInterval = selectedInterval)
              checkingOut = false
              if (result.success && result.checkoutUrl.isNotBlank()) {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(result.checkoutUrl)))
              }
            }
          }, enabled = !checkingOut, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
            Text(if (checkingOut) stringResource(R.string.subscription_redirecting) else stringResource(R.string.subscription_upgrade))
          }
        }
      }
      if (ui.features.isNotEmpty()) {
        item { KSoftSectionHead(kanji = "特", title = stringResource(R.string.subscription_features)) }
        items(ui.features) { feature ->
          Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(14.dp)) {
              Text("✓", style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.primary)
              Text(feature, style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(start = 10.dp))
            }
          }
        }
      }
    }
  }
}

// ── ReadingArticleScreen ───────────────────────────────────────────
@Composable
internal fun ReadingArticleScreen(articleId: String, onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val vm: ReadingArticleViewModel = viewModel(key = "article-$articleId", factory = ReadingArticleViewModel.factory(ComposeServiceLocator.contentRepository, articleId))
  val contentRepository = ComposeServiceLocator.contentRepository
  val ui by vm.uiState.collectAsStateWithLifecycle()
  val scope = rememberCoroutineScope()
  var showTranslation by remember(articleId) { mutableStateOf(false) }
  var lookupWord by remember(articleId) { mutableStateOf("") }
  var lookupMeaning by remember(articleId) { mutableStateOf("") }
  var lookupError by remember(articleId) { mutableStateOf<String?>(null) }
  var isLookupOpen by remember(articleId) { mutableStateOf(false) }
  var isLookupLoading by remember(articleId) { mutableStateOf(false) }
  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)) {
    item { ParityBackRow("讀 · ARTICLE", ui.title.ifBlank { stringResource(R.string.article_title) }, onBack) }
    if (ui.isLoading) { item { ParityLoadingCard(stringResource(R.string.article_loading)) } }
    ui.errorMessage?.let { msg -> item { ParityErrorCard(msg) { vm.refresh() } } }
    if (!ui.isLoading && ui.errorMessage == null) {
      if (ui.source.isNotBlank() || ui.pubDate.isNotBlank()) {
        item { Text(listOf(ui.source, ui.pubDate).filter { it.isNotBlank() }.joinToString(" · "), style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold), color = HangyeolTheme.extendedColors.subtext) }
      }
      if (ui.tags.isNotEmpty()) {
        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) { items(ui.tags) { tag -> KSoftChip(text = tag, tone = "muted", size = "sm") } } }
      }
      item {
        Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(20.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
          Column(modifier = Modifier.padding(20.dp)) {
            Text(ui.body.ifBlank { stringResource(R.string.article_empty) }, style = HangyeolTheme.typography.bodyLarge.copy(lineHeight = 28.sp), color = HangyeolTheme.colorScheme.onSurface)
            val lookupTokens = extractLookupTokens(ui.body)
            if (lookupTokens.isNotEmpty()) {
              LazyRow(modifier = Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(lookupTokens) { token ->
                  KSoftChip(text = token, tone = "muted", size = "sm", modifier = Modifier.clickable {
                    lookupWord = token; lookupMeaning = ""; lookupError = null; isLookupOpen = true; isLookupLoading = true
                    scope.launch {
                      try { val r = contentRepository.searchDictionary(token); lookupMeaning = r.entries.firstOrNull()?.meaningZh?.takeIf { it.isNotBlank() } ?: "暂未查到"; lookupError = r.errorMessage }
                      catch (t: Throwable) { lookupError = t.message }
                      finally { isLookupLoading = false }
                    }
                  })
                }
              }
            }
          }
        }
      }
      if (ui.bodyTranslation.isNotBlank()) {
        item {
          Surface(modifier = Modifier.fillMaxWidth().clickable { showTranslation = !showTranslation },
            color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
            Column(modifier = Modifier.padding(16.dp)) {
              Text(if (showTranslation) stringResource(R.string.article_hide_translation) else stringResource(R.string.article_show_translation), style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.primary)
              if (showTranslation) { Text(ui.bodyTranslation, style = HangyeolTheme.typography.bodyMedium.copy(lineHeight = 24.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 8.dp)) }
            }
          }
        }
      }
    }
  }
  if (isLookupOpen) {
    AlertDialog(onDismissRequest = { isLookupOpen = false },
      confirmButton = { TextButton(onClick = { isLookupOpen = false }) { Text("关闭") } },
      title = { Text(lookupWord.ifBlank { "词典" }) },
      text = { Column { if (isLookupLoading) Text("查询中...") else Text(lookupMeaning.ifBlank { "未找到" }); lookupError?.let { Text(it, color = HangyeolTheme.extendedColors.crimson) } } })
  }
}

// ── AvatarUploadScreen (integrated into ProfileScreen) ─────────────
@Composable
internal fun AvatarUploadDialog(onDismiss: () -> Unit, onUploaded: () -> Unit) {
  val contentRepository = ComposeServiceLocator.contentRepository
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  var uploading by remember { mutableStateOf(false) }
  var errorMsg by remember { mutableStateOf<String?>(null) }
  val launcher = rememberLauncherForActivityResult(
    contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
  ) { uri ->
    if (uri == null) return@rememberLauncherForActivityResult
    uploading = true; errorMsg = null
    scope.launch {
      try {
        val presigned = contentRepository.getUploadUrl(filename = "avatar.jpg", contentType = "image/jpeg", fileSize = 0, folder = "avatars")
        if (!presigned.success) { errorMsg = presigned.errorMessage ?: "获取上传地址失败"; uploading = false; return@launch }
        val uploadOk = uploadFileToPresignedUrl(context, uri, presigned.uploadUrl, presigned.publicUrl, "image/jpeg")
        if (uploadOk == null) { errorMsg = "文件上传失败"; uploading = false; return@launch }
        val saveResult = contentRepository.updateAvatar(uploadOk)
        if (saveResult.success) { onUploaded() } else { errorMsg = saveResult.errorMessage ?: "保存头像失败" }
      } catch (t: Throwable) { errorMsg = t.message ?: "上传失败" }
      uploading = false
    }
  }
  AlertDialog(onDismissRequest = { if (!uploading) onDismiss() },
    confirmButton = {
      TextButton(onClick = { launcher.launch("image/*") }, enabled = !uploading) { Text(if (uploading) "上传中..." else "选择图片") }
    },
    dismissButton = { TextButton(onClick = onDismiss, enabled = !uploading) { Text("取消") } },
    title = { Text("更换头像") },
    text = { Column { Text("从相册选择一张图片作为头像（最大 5MB）"); errorMsg?.let { Text(it, color = HangyeolTheme.extendedColors.crimson, modifier = Modifier.padding(top = 8.dp)) } } })
}

// ── EpubUploadScreen ───────────────────────────────────────────────
@Composable
internal fun EpubUploadScreen(onBack: () -> Unit, onNavigateRoute: (String) -> Unit) {
  val contentRepository = ComposeServiceLocator.contentRepository
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  var title by remember { mutableStateOf("") }
  var author by remember { mutableStateOf("") }
  var description by remember { mutableStateOf("") }
  var language by remember { mutableStateOf("ko") }
  var uploading by remember { mutableStateOf(false) }
  var errorMsg by remember { mutableStateOf<String?>(null) }
  var successMsg by remember { mutableStateOf<String?>(null) }
  var selectedFileName by remember { mutableStateOf<String?>(null) }
  var selectedFileKey by remember { mutableStateOf<String?>(null) }
  val launcher = rememberLauncherForActivityResult(
    contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
  ) { uri ->
    if (uri == null) return@rememberLauncherForActivityResult
    selectedFileName = uri.lastPathSegment ?: "book.epub"
    uploading = true; errorMsg = null; successMsg = null
    scope.launch {
      try {
        val presigned = contentRepository.getUploadUrl(filename = selectedFileName!!, contentType = "application/epub+zip", fileSize = 0, folder = "ebooks")
        if (!presigned.success) { errorMsg = presigned.errorMessage; uploading = false; return@launch }
        val uploadOk = uploadFileToPresignedUrl(context, uri, presigned.uploadUrl, presigned.publicUrl, "application/epub+zip")
        if (uploadOk == null) { errorMsg = "EPUB 文件上传失败"; uploading = false; return@launch }
        selectedFileKey = presigned.key
        successMsg = "文件已上传，请填写信息后提交"
      } catch (t: Throwable) { errorMsg = t.message }
      uploading = false
    }
  }
  LazyColumn(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)) {
    item { ParityBackRow("冊 · UPLOAD", stringResource(R.string.epub_upload_title), onBack) }
    item {
      Button(onClick = { launcher.launch("application/epub+zip") }, enabled = !uploading, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
        Text(if (uploading) "上传中..." else selectedFileName?.let { "已选: $it" } ?: "选择 EPUB 文件")
      }
    }
    item { OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("书名") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
    item { OutlinedTextField(value = author, onValueChange = { author = it }, label = { Text("作者") }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
    item { OutlinedTextField(value = description, onValueChange = { description = it }, label = { Text("简介（可选）") }, modifier = Modifier.fillMaxWidth(), minLines = 2) }
    item {
      Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("ko" to "韩语", "zh" to "中文", "en" to "英语").forEach { (code, label) ->
          Surface(modifier = Modifier.weight(1f).clickable { language = code },
            color = if (language == code) HangyeolTheme.extendedColors.tintMint else HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
            Text(label, style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp))
          }
        }
      }
    }
    errorMsg?.let { msg -> item { ParityErrorCard(msg) {} } }
    successMsg?.let { msg -> item { Text(msg, style = HangyeolTheme.typography.bodySmall, color = HangyeolTheme.colorScheme.secondary) } }
    item {
      Button(onClick = {
        val key = selectedFileKey
        if (key.isNullOrBlank() || title.isBlank() || author.isBlank()) { errorMsg = "请先上传文件并填写书名和作者"; return@Button }
        uploading = true; errorMsg = null
        scope.launch {
          val result = contentRepository.createEpubUploadDraft(title = title, author = author, description = description.ifBlank { null }, language = language, tags = emptyList(), epubObjectKey = key)
          uploading = false
          if (result.success) {
            successMsg = "上传成功"
            if (result.slug.isNotBlank()) { onNavigateRoute(HangyeolDestination.EpubReader.createRoute(result.slug)) }
          } else { errorMsg = result.errorMessage ?: "提交失败" }
        }
      }, enabled = !uploading && selectedFileKey != null && title.isNotBlank() && author.isNotBlank(), shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
        Text(if (uploading) "提交中..." else "提交书籍")
      }
    }
  }
}

private suspend fun uploadFileToPresignedUrl(context: android.content.Context, uri: android.net.Uri, uploadUrl: String, publicUrl: String, contentType: String = "application/octet-stream"): String? {
  if (uploadUrl.isBlank()) return publicUrl.ifBlank { null }
  return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
    try {
      val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return@withContext null
      val body = bytes.toRequestBody(contentType.toMediaType())
      val request = okhttp3.Request.Builder().url(uploadUrl).put(body).build()
      val response = okhttp3.OkHttpClient().newCall(request).execute()
      if (response.isSuccessful) publicUrl.ifBlank { null } else null
    } catch (_: Exception) { null }
  }
}

// ── Shared helpers ──────────────────────────────────────────────────
@Composable
private fun ParityBackRow(label: String, title: String, onBack: () -> Unit) {
  Row(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
    Surface(modifier = Modifier.size(36.dp).clickable { onBack() }, color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp),
      border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), shadowElevation = 2.dp) {
      Box(contentAlignment = Alignment.Center) { Text("←", style = HangyeolTheme.typography.titleMedium.copy(fontSize = 16.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface) }
    }
    Column(modifier = Modifier.weight(1f)) {
      Text(label, style = KSoftSerifLabelStyle(), color = HangyeolTheme.colorScheme.secondary)
      Text(title, style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 30.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 4.dp))
    }
  }
}

@Composable
private fun ParityLoadingCard(msg: String) {
  Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
    Text(msg, modifier = Modifier.padding(20.dp), style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext)
  }
}

@Composable
private fun ParityErrorCard(msg: String, onRetry: () -> Unit) {
  Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
    Column(modifier = Modifier.padding(20.dp)) {
      Text(msg, style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.crimson)
      Text("点击重试", modifier = Modifier.padding(top = 8.dp).clickable { onRetry() }, style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.primary)
    }
  }
}

@Composable
private fun ParityEmptyCard(msg: String, onRefresh: () -> Unit) {
  Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
    Column(modifier = Modifier.padding(20.dp)) {
      Text(msg, style = HangyeolTheme.typography.bodyMedium, color = HangyeolTheme.extendedColors.subtext)
      Text("刷新", modifier = Modifier.padding(top = 8.dp).clickable { onRefresh() }, style = HangyeolTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.primary)
    }
  }
}

@Composable
private fun ParityWordRow(word: String, meaning: String, pronunciation: String) {
  Surface(color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft), modifier = Modifier.fillMaxWidth()) {
    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
      Column(modifier = Modifier.weight(1f)) {
        Text(word, style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface)
        if (pronunciation.isNotBlank()) { Text(pronunciation, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp), color = HangyeolTheme.extendedColors.subtext) }
      }
      Text(meaning, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(start = 8.dp))
    }
  }
}

private fun extractLookupTokens(text: String): List<String> {
  if (text.isBlank()) return emptyList()
  val matches = Regex("[가-힣A-Za-z]{2,}").findAll(text)
  return matches.map { it.value.trim() }
    .filter { it.isNotBlank() }
    .distinct()
    .take(8)
    .toList()
}

@Composable
internal fun ReviewQuizScreen(onBack: () -> Unit) {
  val vm: ReviewQuizViewModel = viewModel(factory = ReviewQuizViewModel.factory(ComposeServiceLocator.learningRepository))
  val ui by vm.uiState.collectAsStateWithLifecycle()
  val context = LocalContext.current
  val scope = rememberCoroutineScope()
  var ttsEngine by remember { mutableStateOf<TextToSpeech?>(null) }
  var ttsReady by remember { mutableStateOf(false) }

  DisposableEffect(Unit) {
    val tts = TextToSpeech(context) { status ->
      if (status == TextToSpeech.SUCCESS) {
        val result = tts.setLanguage(Locale.KOREAN)
        if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
          ttsReady = true
        }
      }
    }
    ttsEngine = tts
    onDispose { tts.stop(); tts.shutdown() }
  }

  fun speak(text: String) {
    if (ttsReady) {
      ttsEngine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
    }
  }

  Column(modifier = Modifier.fillMaxSize().background(HangyeolTheme.colorScheme.background).statusBarsPadding().padding(horizontal = 18.dp)) {
    // Header
    Row(modifier = Modifier.padding(vertical = 16.dp), verticalAlignment = Alignment.CenterVertically) {
      Surface(modifier = Modifier.size(36.dp).clickable { onBack() }, color = HangyeolTheme.colorScheme.surface, shape = CircleShape, border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
        Box(contentAlignment = Alignment.Center) { Text("×", style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.colorScheme.onSurface) }
      }
      Column(modifier = Modifier.weight(1f).padding(horizontal = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(stringResource(R.string.review_quiz_title), style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp), color = HangyeolTheme.extendedColors.subtext)
        if (!ui.isComplete && ui.questions.isNotEmpty()) {
          Text(stringResource(R.string.review_quiz_question_count, ui.currentIndex + 1, ui.questions.size), style = HangyeolTheme.typography.bodySmall.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface)
        }
      }
      Surface(color = HangyeolTheme.colorScheme.onSurface, shape = RoundedCornerShape(12.dp)) {
        Text("02:14", style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.surface, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
      }
    }

    if (!ui.isComplete && ui.questions.isNotEmpty()) {
      // Progress Bar
      Row(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        ui.questions.forEachIndexed { idx, _ ->
          val color = when {
            idx == ui.currentIndex -> HangyeolTheme.colorScheme.onSurface
            idx < ui.currentIndex -> HangyeolTheme.extendedColors.mint
            else -> HangyeolTheme.extendedColors.lineSoft
          }
          Box(modifier = Modifier.weight(1f).height(4.dp).background(color, RoundedCornerShape(2.dp)))
        }
      }

      val q = ui.questions[ui.currentIndex]

      // Question Card
      Surface(modifier = Modifier.fillMaxWidth(), color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(24.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
        Column(modifier = Modifier.padding(24.dp)) {
          Text("CHOOSE THE CORRECT MEANING", style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 1.sp), color = HangyeolTheme.extendedColors.subtext)
          Row(modifier = Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(q.korean, style = HangyeolTheme.typography.headlineLarge.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
            Surface(modifier = Modifier.size(40.dp).clickable { speak(q.korean) }, color = HangyeolTheme.colorScheme.onSurface, shape = CircleShape) {
              Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.VolumeUp, contentDescription = null, tint = HangyeolTheme.colorScheme.surface, modifier = Modifier.size(18.dp)) }
            }
          }
          Text("“${q.partOfSpeech}”", style = HangyeolTheme.typography.bodyMedium.copy(fontStyle = FontStyle.Italic), color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 4.dp))
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      // Options
      Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        q.options.forEachIndexed { idx, opt ->
          QuizOption(label = ('A' + idx).toString(), text = opt, onClick = { vm.submitAnswer(idx) })
        }
      }
    } else if (ui.isComplete) {
      // Complete Screen
      Column(modifier = Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Surface(color = HangyeolTheme.extendedColors.mint.copy(alpha = .1f), shape = RoundedCornerShape(20.dp), modifier = Modifier.size(80.dp)) {
          Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.EmojiEvents, contentDescription = null, tint = HangyeolTheme.extendedColors.mint, modifier = Modifier.size(40.dp)) }
        }
        Text(stringResource(R.string.review_quiz_complete), style = HangyeolTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 24.dp))
        Text(stringResource(R.string.review_quiz_score, ui.score, ui.questions.size), style = HangyeolTheme.typography.bodyLarge, color = HangyeolTheme.extendedColors.subtext, modifier = Modifier.padding(top = 8.dp))
        
        Spacer(modifier = Modifier.height(40.dp))
        
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
          Text(stringResource(R.string.review_quiz_back_to_dashboard), style = HangyeolTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        }
        TextButton(onClick = { vm.loadQuestions() }, modifier = Modifier.padding(top = 8.dp)) {
          Text(stringResource(R.string.review_quiz_retry), color = HangyeolTheme.colorScheme.primary)
        }
      }
    } else if (ui.isLoading) {
      ParityLoadingCard("Loading Questions...")
    }
  }
}

@Composable
private fun QuizOption(label: String, text: String, onClick: () -> Unit) {
  Surface(modifier = Modifier.fillMaxWidth().clickable { onClick() }, color = HangyeolTheme.colorScheme.surface, shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft)) {
    Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
      Surface(color = HangyeolTheme.colorScheme.background, shape = RoundedCornerShape(8.dp), modifier = Modifier.size(32.dp)) {
        Box(contentAlignment = Alignment.Center) { Text(label, style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold), color = HangyeolTheme.colorScheme.onSurface) }
      }
      Text(text, style = HangyeolTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold), color = HangyeolTheme.colorScheme.onSurface, modifier = Modifier.weight(1f).padding(start = 14.dp))
      Text("→", style = HangyeolTheme.typography.titleMedium, color = HangyeolTheme.extendedColors.lineSoft)
    }
  }
}

// ── CommunityScreen ───────────────────────────────────────────────
@Composable
internal fun CommunityScreen(
  mode: String,
  onBack: () -> Unit,
  onNavigateRoute: (String) -> Unit,
) {
  val viewModel: CommunityViewModel =
    viewModel(factory = CommunityViewModel.factory(ComposeServiceLocator.contentRepository, mode))
  val uiState by viewModel.uiState.collectAsStateWithLifecycle()
  val likeInFlightIds by viewModel.likeInFlightIds.collectAsStateWithLifecycle()
  val isHub = mode == "hub"
  val hasEmptyRankings = !uiState.isLoading && uiState.errorMessage == null && uiState.rankings.isEmpty()
  val hasEmptyFeed = !uiState.isLoading && uiState.errorMessage == null && uiState.feed.isEmpty()
  val hasEmptySuggestions = !uiState.isLoading && uiState.errorMessage == null && uiState.suggestions.isEmpty()

  LazyColumn(
    modifier =
      Modifier
        .fillMaxSize()
        .background(HangyeolTheme.colorScheme.background)
        .statusBarsPadding()
        .padding(horizontal = 18.dp),
    verticalArrangement = Arrangement.spacedBy(18.dp),
    contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
  ) {
    item {
      ParityBackRow(
        kanji = "會 · COMMUNITY",
        title = if (isHub) stringResource(R.string.community_title) else stringResource(R.string.community_add_title),
        onBack = onBack
      )
    }
    
    item {
      Text(
        text = if (isHub) stringResource(R.string.community_desc) else stringResource(R.string.community_add_desc),
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = Modifier.padding(horizontal = 2.dp)
      )
    }

    if (uiState.isLoading) {
      item { ParityLoadingCard(stringResource(R.string.community_loading)) }
    }
    
    uiState.errorMessage?.let { errorMessage ->
      item { ParityErrorCard(errorMessage) { viewModel.refresh() } }
    }

    if (isHub) {
      item {
        CommunitySectionHead(
          kanji = "盟",
          title = stringResource(R.string.community_league_title),
          action = stringResource(R.string.community_league_desc)
        )
      }
      
      if (hasEmptyRankings) {
        item { ParityEmptyCard(stringResource(R.string.community_no_rankings)) { viewModel.refresh() } }
      } else {
        item {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 3.dp,
          ) {
            Column(modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp)) {
              Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                uiState.rankings.forEach { row ->
                  CommunityLeagueRow(row = row)
                }
              }
            }
          }
        }
      }
      
      item {
        CommunitySectionHead(
          kanji = "友",
          title = stringResource(R.string.community_feed_title),
          action = stringResource(R.string.community_feed_all),
          onAction = { onNavigateRoute(HangyeolDestination.CommunityAdd.pattern) },
        )
      }
      
      if (hasEmptyFeed) {
        item { ParityEmptyCard(stringResource(R.string.community_no_feed)) { viewModel.refresh() } }
      } else {
        item {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 3.dp,
          ) {
            Column(modifier = Modifier.fillMaxWidth()) {
              uiState.feed.take(5).forEachIndexed { index, item ->
                CommunityFeedRow(
                  item = item,
                  showDivider = index != uiState.feed.take(5).lastIndex,
                  likeInFlight = item.activityId.isNotBlank() && likeInFlightIds.contains(item.activityId),
                  onToggleLike = {
                    viewModel.toggleActivityLike(
                      activityId = item.activityId,
                      likedByMe = item.likedByMe,
                    )
                  },
                )
              }
            }
          }
        }
      }
      
      item {
        CommunityPartnerCard(
          friendSummary = uiState.friendSummary,
          shareCode = uiState.shareCode,
          onAction = { onNavigateRoute(HangyeolDestination.CommunityAdd.pattern) },
        )
      }
    } else {
      item {
        Surface(
          modifier = Modifier.fillMaxWidth(),
          color = HangyeolTheme.colorScheme.surface,
          shape = RoundedCornerShape(24.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          shadowElevation = 3.dp,
        ) {
          Column(modifier = Modifier.padding(18.dp)) {
            Text(
              text = stringResource(R.string.community_share_code),
              style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
              color = HangyeolTheme.extendedColors.subtext,
            )
            Text(
              text = uiState.shareCode.ifBlank { "--" },
              style = HangyeolTheme.typography.headlineMedium.copy(fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
              modifier = Modifier.padding(top = 6.dp),
            )
            Text(
              text = uiState.shareUrl.ifBlank { "https://hangyeol.app/invite/${uiState.shareCode}" },
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.extendedColors.subtext,
              modifier = Modifier.padding(top = 4.dp),
            )
          }
        }
      }
      
      item {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
          val context = LocalContext.current
          CommunityHeaderAction(
            modifier = Modifier.weight(1f),
            label = stringResource(R.string.community_share_label),
            onClick = {
              val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, "Join me on Hangyeol! My invite code: ${uiState.shareCode}\n${uiState.shareUrl}")
              }
              context.startActivity(Intent.createChooser(intent, "Share Invite Code"))
            },
          )
          CommunityHeaderAction(
            modifier = Modifier.weight(1f),
            label = stringResource(R.string.community_back_to_hub),
            onClick = { onBack() },
          )
        }
      }
      
      item {
        CommunitySectionHead(
          kanji = "搜",
          title = stringResource(R.string.community_suggestions_title),
        )
      }
      
      if (hasEmptySuggestions) {
        item { ParityEmptyCard(stringResource(R.string.community_no_suggestions)) { viewModel.refresh() } }
      } else {
        item {
          Surface(
            modifier = Modifier.fillMaxWidth(),
            color = HangyeolTheme.colorScheme.surface,
            shape = RoundedCornerShape(24.dp),
            border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
            shadowElevation = 3.dp,
          ) {
            Column(modifier = Modifier.fillMaxWidth()) {
              uiState.suggestions.forEachIndexed { index, suggestion ->
                CommunitySuggestionRow(
                  title = suggestion.first,
                  subtitle = suggestion.second,
                  showDivider = index != uiState.suggestions.lastIndex,
                )
              }
            }
          }
        }
      }
    }
  }
}

@Composable
private fun CommunitySectionHead(
  kanji: String,
  title: String,
  action: String? = null,
  onAction: (() -> Unit)? = null,
) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.Bottom,
  ) {
    Row(
      horizontalArrangement = Arrangement.spacedBy(8.dp),
      verticalAlignment = Alignment.Bottom,
    ) {
      Text(
        text = kanji,
        style = HangyeolTheme.typography.bodyMedium.copy(
          fontFamily = FontFamily.Serif,
          fontSize = 16.sp,
          lineHeight = 16.sp,
          fontWeight = FontWeight.Medium,
        ),
        color = HangyeolTheme.extendedColors.crimson.copy(alpha = 0.85f),
      )
      Text(
        text = title,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
    }
    action?.let { label ->
      Text(
        text = label,
        style = HangyeolTheme.typography.labelSmall.copy(fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = if (onAction != null) Modifier.clickable { onAction() } else Modifier,
      )
    }
  }
}

@Composable
private fun CommunityLeagueRow(
  row: CommunityRankUiModel,
) {
  Row(
    modifier =
      Modifier
        .fillMaxWidth()
        .background(
          color = if (row.highlight) HangyeolTheme.extendedColors.tintButter.copy(alpha = 0.38f) else Color.Transparent,
          shape = RoundedCornerShape(12.dp),
        )
        .padding(horizontal = 12.dp, vertical = 10.dp),
    horizontalArrangement = Arrangement.spacedBy(10.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Text(
      text = row.rank.toString(),
      style = HangyeolTheme.typography.bodyMedium.copy(
        fontFamily = FontFamily.Serif,
        fontSize = 15.sp,
        lineHeight = 15.sp,
        fontWeight = FontWeight.SemiBold,
      ),
      color = if (row.rank <= 3) HangyeolTheme.extendedColors.gold else HangyeolTheme.extendedColors.subtext,
      modifier = Modifier.width(26.dp),
    )
    Surface(
      modifier = Modifier.size(34.dp),
      color = shortcutAccent(row.accent),
      shape = RoundedCornerShape(10.dp),
    ) {
      Box(contentAlignment = Alignment.Center) {
        Text(text = row.emoji, style = HangyeolTheme.typography.bodySmall.copy(fontSize = 16.sp, lineHeight = 16.sp))
      }
    }
    Text(
      text = row.name,
      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
      color = HangyeolTheme.colorScheme.onSurface,
      modifier = Modifier.weight(1f),
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
    )
    Text(
      text = row.xp.toString(),
      style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
      color = HangyeolTheme.colorScheme.onSurface,
    )
    Text(
      text = if (row.rank <= 3) "↑" else "·",
      style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.ExtraBold),
      color = if (row.rank <= 3) HangyeolTheme.extendedColors.jade else HangyeolTheme.extendedColors.subtext,
    )
  }
}

@Composable
private fun CommunityFeedRow(
  item: CommunityFeedUiModel,
  showDivider: Boolean,
  likeInFlight: Boolean,
  onToggleLike: () -> Unit,
) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Surface(
      modifier = Modifier.size(40.dp),
      color = shortcutAccent(item.accent),
      shape = RoundedCornerShape(12.dp),
    ) {
      Box(contentAlignment = Alignment.Center) {
        Text(text = item.emoji, style = HangyeolTheme.typography.bodyMedium.copy(fontSize = 18.sp, lineHeight = 18.sp))
      }
    }
    Column(modifier = Modifier.weight(1f)) {
      Text(
        text = item.actorName,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
      Text(
        text = item.action,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 2.dp),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
      Text(
        text = item.time,
        style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.SemiBold),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = Modifier.padding(top = 2.dp),
      )
    }
    Column(
      horizontalAlignment = Alignment.End,
      verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
      if (item.badgeLabel.isNotBlank()) {
        KSoftChip(text = item.badgeLabel, tone = "muted", size = "sm")
      }
      Row(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        if (item.deltaLabel.isNotBlank()) {
          Text(
            text = item.deltaLabel,
            style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.extendedColors.jade,
          )
        }
        if (item.likeCount > 0) {
          Text(
            text = item.likeCount.toString(),
            style = HangyeolTheme.typography.labelSmall.copy(fontWeight = FontWeight.ExtraBold),
            color = HangyeolTheme.extendedColors.subtext,
          )
        }
        val canLike = item.activityId.isNotBlank()
        Surface(
          color = if (item.likedByMe) HangyeolTheme.extendedColors.tintPink else Color.Transparent,
          shape = RoundedCornerShape(999.dp),
          border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
          modifier =
            Modifier
              .size(28.dp)
              .alpha(if (canLike && !likeInFlight) 1f else 0.55f)
              .clickable(enabled = canLike && !likeInFlight) { onToggleLike() },
        ) {
          Box(contentAlignment = Alignment.Center) {
            Text(
              text = if (item.likedByMe) "♥" else "♡",
              style = HangyeolTheme.typography.labelLarge.copy(fontSize = 13.sp, lineHeight = 13.sp, fontWeight = FontWeight.Bold),
              color = if (item.likedByMe) HangyeolTheme.extendedColors.crimson else HangyeolTheme.extendedColors.subtext,
            )
          }
        }
      }
    }
  }
  if (showDivider) {
    HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
  }
}

@Composable
private fun CommunityPartnerCard(
  friendSummary: CommunityFriendSummaryUiModel?,
  shareCode: String,
  onAction: () -> Unit,
) {
  val mutualCount = friendSummary?.mutualCount ?: 0
  val followingCount = friendSummary?.followingCount ?: 0
  val followerCount = friendSummary?.followerCount ?: 0
  val incomingPendingCount = friendSummary?.incomingPendingCount ?: 0
  val outgoingPendingCount = friendSummary?.outgoingPendingCount ?: 0
  
  val headline = if (mutualCount > 0) {
    stringResource(R.string.community_mutual_count, mutualCount)
  } else {
    stringResource(R.string.community_no_mutual)
  }
  
  val subtitle = when {
    incomingPendingCount > 0 -> stringResource(R.string.community_pending_incoming, incomingPendingCount)
    outgoingPendingCount > 0 -> stringResource(R.string.community_pending_outgoing, outgoingPendingCount)
    followingCount > 0 || followerCount > 0 -> stringResource(R.string.community_social_counts, followingCount, followerCount)
    else -> stringResource(R.string.community_invite_first)
  }
  
  val actionLabel = if (incomingPendingCount > 0) stringResource(R.string.community_action_view_requests) else stringResource(R.string.community_action_go_add)

  Surface(
    modifier = Modifier.fillMaxWidth(),
    color = Color.Transparent,
    shape = RoundedCornerShape(24.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 3.dp,
  ) {
    Box(
      modifier =
        Modifier
          .background(
            brush =
              Brush.linearGradient(
                colors =
                  listOf(
                    HangyeolTheme.extendedColors.tintMint.copy(alpha = 0.62f),
                    HangyeolTheme.extendedColors.sky.copy(alpha = 0.48f),
                  ),
              ),
            shape = RoundedCornerShape(24.dp),
          ),
    ) {
      Column(modifier = Modifier.padding(18.dp)) {
        KSoftChip(text = "学习伙伴 · 伴", tone = "ink", size = "sm")
        Row(
          modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
          horizontalArrangement = Arrangement.spacedBy(16.dp),
          verticalAlignment = Alignment.CenterVertically,
        ) {
          KSoftHanjaSeal(
            c = "友",
            size = 48,
            round = 14,
            bg = Color.White.copy(alpha = 0.86f),
            color = HangyeolTheme.extendedColors.crimson,
          )
          Column(modifier = Modifier.weight(1f)) {
            Text(
              text = headline,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 15.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onSurface,
            )
            Text(
              text = subtitle,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium),
              color = HangyeolTheme.colorScheme.onSurfaceVariant,
              modifier = Modifier.padding(top = 2.dp),
            )
            if (shareCode.isNotBlank()) {
              Text(
                text = stringResource(R.string.community_share_code) + " " + shareCode,
                style = HangyeolTheme.typography.labelSmall.copy(fontSize = 10.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold),
                color = HangyeolTheme.extendedColors.subtext,
                modifier = Modifier.padding(top = 4.dp),
              )
            }
          }
          Surface(
            modifier = Modifier.clickable { onAction() },
            color = HangyeolTheme.colorScheme.primary,
            shape = RoundedCornerShape(14.dp),
          ) {
            Text(
              text = actionLabel,
              style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
              color = HangyeolTheme.colorScheme.onPrimary,
              modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            )
          }
        }
      }
    }
  }
}

@Composable
private fun CommunityHeaderAction(
  modifier: Modifier = Modifier,
  label: String,
  onClick: () -> Unit,
) {
  Surface(
    modifier = modifier.clickable { onClick() },
    color = HangyeolTheme.colorScheme.surface,
    shape = RoundedCornerShape(19.dp),
    border = BorderStroke(1.dp, HangyeolTheme.extendedColors.lineSoft),
    shadowElevation = 2.dp,
  ) {
    Box(
      modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
      contentAlignment = Alignment.Center,
    ) {
      Text(
        text = label,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 12.sp, lineHeight = 14.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
    }
  }
}

@Composable
private fun CommunitySuggestionRow(
  title: String,
  subtitle: String,
  showDivider: Boolean,
) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
    horizontalArrangement = Arrangement.spacedBy(12.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    KSoftHanjaSeal(
      c = "友",
      size = 34,
      round = 10,
      bg = HangyeolTheme.extendedColors.tintPink,
      color = HangyeolTheme.extendedColors.crimson,
    )
    Column(modifier = Modifier.weight(1f)) {
      Text(
        text = title,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 13.sp, lineHeight = 16.sp, fontWeight = FontWeight.ExtraBold),
        color = HangyeolTheme.colorScheme.onSurface,
      )
      Text(
        text = subtitle,
        style = HangyeolTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Medium),
        color = HangyeolTheme.extendedColors.subtext,
        modifier = Modifier.padding(top = 2.dp),
      )
    }
    Text(
      text = "›",
      style = HangyeolTheme.typography.titleMedium.copy(fontSize = 18.sp, lineHeight = 18.sp, fontWeight = FontWeight.ExtraBold),
      color = HangyeolTheme.extendedColors.subtext,
    )
  }
  if (showDivider) {
    HorizontalDivider(color = HangyeolTheme.extendedColors.lineSoft)
  }
}

@Composable
internal fun shortcutAccent(accent: String): Color =
  when (accent) {
    "mint" -> HangyeolTheme.extendedColors.tintMint
    "butter" -> HangyeolTheme.extendedColors.tintButter
    "lilac" -> HangyeolTheme.extendedColors.tintLilac
    else -> HangyeolTheme.extendedColors.tintPink
  }
