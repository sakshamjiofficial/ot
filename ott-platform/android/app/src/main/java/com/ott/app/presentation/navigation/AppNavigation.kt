package com.ott.app.presentation.navigation

import androidx.compose.animation.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.*
import androidx.navigation.compose.*
import com.ott.app.presentation.auth.AuthViewModel
import com.ott.app.presentation.auth.LoginScreen
import com.ott.app.presentation.auth.RegisterScreen
import com.ott.app.presentation.home.HomeScreen
import com.ott.app.presentation.player.PlayerScreen
import com.ott.app.presentation.search.SearchScreen
import com.ott.app.presentation.profile.ProfileScreen
import com.ott.app.presentation.content.ContentDetailScreen
import com.ott.app.presentation.splash.SplashScreen

object Routes {
    const val SPLASH         = "splash"
    const val LOGIN          = "login"
    const val REGISTER       = "register"
    const val HOME           = "home"
    const val SEARCH         = "search"
    const val PROFILE        = "profile"
    const val CONTENT_DETAIL = "content/{contentId}"
    const val PLAYER_CONTENT = "player/content/{contentId}"
    const val PLAYER_EPISODE = "player/episode/{episodeId}"

    fun contentDetail(id: String) = "content/$id"
    fun playerContent(id: String) = "player/content/$id"
    fun playerEpisode(id: String) = "player/episode/$id"
}

@Composable
fun AppNavigation(modifier: Modifier = Modifier) {
    val navController  = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val isLoggedIn     by authViewModel.isLoggedIn.collectAsStateWithLifecycle()

    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH,
        modifier = modifier,
        enterTransition  = { fadeIn() + slideInHorizontally { it / 3 } },
        exitTransition   = { fadeOut() + slideOutHorizontally { -it / 3 } },
        popEnterTransition  = { fadeIn() + slideInHorizontally { -it / 3 } },
        popExitTransition   = { fadeOut() + slideOutHorizontally { it / 3 } },
    ) {

        // ── Splash ───────────────────────────────────────────
        composable(Routes.SPLASH) {
            SplashScreen(
                onComplete = {
                    val dest = if (isLoggedIn) Routes.HOME else Routes.LOGIN
                    navController.navigate(dest) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }

        // ── Auth ─────────────────────────────────────────────
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess   = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onRegisterClick  = { navController.navigate(Routes.REGISTER) },
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onLoginClick = { navController.popBackStack() },
            )
        }

        // ── Main Screens ─────────────────────────────────────
        composable(Routes.HOME) {
            HomeScreen(
                onContentClick = { id -> navController.navigate(Routes.contentDetail(id)) },
                onSearchClick  = { navController.navigate(Routes.SEARCH) },
                onProfileClick = { navController.navigate(Routes.PROFILE) },
            )
        }

        composable(Routes.SEARCH) {
            SearchScreen(
                onContentClick = { id -> navController.navigate(Routes.contentDetail(id)) },
                onBack         = { navController.popBackStack() },
            )
        }

        composable(Routes.PROFILE) {
            ProfileScreen(
                onBack   = { navController.popBackStack() },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        // ── Content Detail ───────────────────────────────────
        composable(
            route     = Routes.CONTENT_DETAIL,
            arguments = listOf(navArgument("contentId") { type = NavType.StringType }),
        ) { back ->
            val contentId = back.arguments?.getString("contentId") ?: return@composable
            ContentDetailScreen(
                contentId    = contentId,
                onBack       = { navController.popBackStack() },
                onPlayMovie  = { id -> navController.navigate(Routes.playerContent(id)) },
                onPlayEpisode = { epId -> navController.navigate(Routes.playerEpisode(epId)) },
            )
        }

        // ── Player: Movie ────────────────────────────────────
        composable(
            route     = Routes.PLAYER_CONTENT,
            arguments = listOf(navArgument("contentId") { type = NavType.StringType }),
            enterTransition = { fadeIn() },
            exitTransition  = { fadeOut() },
        ) { back ->
            val contentId = back.arguments?.getString("contentId") ?: return@composable
            PlayerScreen(
                contentId = contentId,
                onBack    = { navController.popBackStack() },
            )
        }

        // ── Player: Episode ──────────────────────────────────
        composable(
            route     = Routes.PLAYER_EPISODE,
            arguments = listOf(navArgument("episodeId") { type = NavType.StringType }),
            enterTransition = { fadeIn() },
            exitTransition  = { fadeOut() },
        ) { back ->
            val episodeId = back.arguments?.getString("episodeId") ?: return@composable
            PlayerScreen(
                episodeId = episodeId,
                onBack    = { navController.popBackStack() },
            )
        }
    }
}
