package com.hangyeol.app.compose.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.hangyeol.app.compose.data.ComposeServiceLocator
import com.hangyeol.app.compose.data.convex.ConvexResult
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

@Composable
fun ForgotPasswordScreen(
    onBackToLogin: () -> Unit,
    onSuccess: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isSent by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "找回密码",
                style = MaterialTheme.typography.headlineMedium,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (isSent) "重置链接已发送到你的邮箱，请检查收件箱。"
                else "输入你的注册邮箱，我们将发送密码重置链接。",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(32.dp))

            if (!isSent) {
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("电子邮箱") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            val result = requestPasswordReset(email.trim().lowercase())
                            isLoading = false
                            if (result) {
                                isSent = true
                            } else {
                                snackbarHostState.showSnackbar("发送失败，请检查邮箱地址")
                            }
                        }
                    },
                    enabled = email.contains("@") && !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("发送重置链接")
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            OutlinedButton(
                onClick = onBackToLogin,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("返回登录")
            }
        }
    }
}

@Composable
fun EmailVerificationScreen(
    token: String?,
    onBackToLogin: () -> Unit,
) {
    var isVerifying by remember { mutableStateOf(token != null) }
    var isSuccess by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(token) {
        if (token != null) {
            isVerifying = true
            val result = confirmEmailVerification(token)
            isVerifying = false
            if (result) {
                isSuccess = true
            } else {
                errorMessage = "验证链接已过期或无效"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (isVerifying) {
            CircularProgressIndicator()
            Spacer(modifier = Modifier.height(16.dp))
            Text("正在验证邮箱...")
        } else if (isSuccess) {
            Text(
                text = "邮箱验证成功！",
                style = MaterialTheme.typography.headlineSmall,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "你的邮箱已成功验证，现在可以使用所有功能。",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else if (errorMessage != null) {
            Text(
                text = "验证失败",
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.error,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = errorMessage!!,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Text(
                text = "请检查你的邮箱",
                style = MaterialTheme.typography.headlineSmall,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "我们已发送验证链接到你的邮箱，点击链接完成验证。",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
        OutlinedButton(
            onClick = onBackToLogin,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("返回登录")
        }
    }
}

@Composable
fun PasswordResetConfirmScreen(
    token: String?,
    onBackToLogin: () -> Unit,
    onSuccess: () -> Unit,
) {
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isSuccess by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            if (isSuccess) {
                Text(
                    text = "密码已重置",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "你的密码已成功重置，请使用新密码登录。",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = onSuccess,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("前往登录")
                }
            } else {
                Text(
                    text = "设置新密码",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Spacer(modifier = Modifier.height(24.dp))
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it },
                    label = { Text("新密码") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("确认新密码") },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        scope.launch {
                            if (newPassword != confirmPassword) {
                                snackbarHostState.showSnackbar("两次输入的密码不一致")
                                return@launch
                            }
                            if (newPassword.length < 8) {
                                snackbarHostState.showSnackbar("密码至少需要 8 位")
                                return@launch
                            }
                            isLoading = true
                            val result = confirmPasswordReset(token ?: "", newPassword)
                            isLoading = false
                            if (result) {
                                isSuccess = true
                            } else {
                                snackbarHostState.showSnackbar("重置失败，链接可能已过期")
                            }
                        }
                    },
                    enabled = newPassword.isNotBlank() && confirmPassword.isNotBlank() && !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("确认重置密码")
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(
                    onClick = onBackToLogin,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("返回登录")
                }
            }
        }
    }
}

// --- Convex API helpers (use unauthenticated client for recovery) ---

private suspend fun requestPasswordReset(email: String): Boolean {
    return try {
        val client = ComposeServiceLocator.convexClient ?: return false
        val args = JsonObject(mapOf("email" to JsonPrimitive(email)))
        val result = client.action("accountRecovery:requestPasswordReset", args)
        result is ConvexResult.Success
    } catch (_: Exception) {
        false
    }
}

private suspend fun confirmPasswordReset(token: String, newPassword: String): Boolean {
    return try {
        val client = ComposeServiceLocator.convexClient ?: return false
        val args = JsonObject(mapOf(
            "token" to JsonPrimitive(token),
            "newPassword" to JsonPrimitive(newPassword),
        ))
        val result = client.action("accountRecovery:confirmPasswordReset", args)
        result is ConvexResult.Success
    } catch (_: Exception) {
        false
    }
}

private suspend fun confirmEmailVerification(token: String): Boolean {
    return try {
        val client = ComposeServiceLocator.convexClient ?: return false
        val args = JsonObject(mapOf("token" to JsonPrimitive(token)))
        val result = client.action("accountRecovery:confirmEmailVerification", args)
        result is ConvexResult.Success
    } catch (_: Exception) {
        false
    }
}
