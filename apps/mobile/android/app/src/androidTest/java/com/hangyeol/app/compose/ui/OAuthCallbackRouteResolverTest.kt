package com.hangyeol.app.compose.ui

import android.content.Intent
import android.net.Uri
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hangyeol.app.compose.navigation.HangyeolDestination
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OAuthCallbackRouteResolverTest {

    @Test
    fun resolvesQueryCallbackWithVerifier() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("hangyeol://oauth/callback?provider=google&code=test-code&verifier=test-verifier"))

        val route = resolveOAuthCallbackRoute(intent)

        val expected = HangyeolDestination.AuthOAuthCallback.createRoute(
            provider = "google",
            code = "test-code",
            verifier = "test-verifier",
        )
        assertEquals(expected, route)
    }

    @Test
    fun resolvesFragmentCallbackWithCodeVerifierAlias() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("hangyeol://auth/oauth-callback#provider=kakao&code=abc123&code_verifier=vfy456"))

        val route = resolveOAuthCallbackRoute(intent)

        val expected = HangyeolDestination.AuthOAuthCallback.createRoute(
            provider = "kakao",
            code = "abc123",
            verifier = "vfy456",
        )
        assertEquals(expected, route)
    }

    @Test
    fun resolvesCallbackRouteWhenCodeMissing() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("hangyeol://auth/oauth-callback?provider=google&verifier=vfy456"))

        val route = resolveOAuthCallbackRoute(intent)

        val expected = HangyeolDestination.AuthOAuthCallback.createRoute(
            provider = "google",
            code = "",
            verifier = "vfy456",
        )
        assertEquals(expected, route)
    }

    @Test
    fun resolvesHttpsLocalizedVerifyEmailRoute() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://hangyeol.app/zh/auth/verify-email?token=verify-123"))

        val route = resolveInboundAuthRoute(intent)

        assertEquals(HangyeolDestination.AuthVerifyEmail.createRoute("verify-123"), route)
    }

    @Test
    fun resolvesHttpsLocalizedResetPasswordRoute() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://koreanstudy.me/en/auth/reset-password?token=reset-456"))

        val route = resolveInboundAuthRoute(intent)

        assertEquals(HangyeolDestination.AuthResetPassword.createRoute("reset-456"), route)
    }

    @Test
    fun resolvesHttpsLocalizedOAuthCallbackRoute() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://hangyeol.app/vi/auth/oauth-callback?provider=google&code=oauth-code&verifier=oauth-verifier"))

        val route = resolveInboundAuthRoute(intent)

        val expected = HangyeolDestination.AuthOAuthCallback.createRoute(
            provider = "google",
            code = "oauth-code",
            verifier = "oauth-verifier",
        )
        assertEquals(expected, route)
    }

    @Test
    fun ignoresUnsupportedHost() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://example.com/zh/auth/verify-email?token=abc"))

        val route = resolveInboundAuthRoute(intent)

        assertNull(route)
    }
}
