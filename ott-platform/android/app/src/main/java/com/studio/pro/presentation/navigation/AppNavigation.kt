package com.studio.pro.presentation.navigation

import androidx.compose.animation.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.*
import androidx.navigation.compose.*
import com.studio.pro.presentation.auth.AuthViewModel
import com.studio.pro.presentation.auth.LoginScreen
import com.studio.pro.presentation.auth.RegisterScreen
import com.studio.pro.presentation.home.HomeScreen
import com.studio.pro.presentation.home.CategoryScreen
import com.studio.pro.presentation.player.PlayerScreen
import com.studio.pro.presentation.search.SearchScreen
import com.studio.pro.presentation.profile.ProfileScreen
import com.studio.pro.presentation.profile.ChooseProfileScreen
import com.studio.pro.presentation.auth.AuthUiState
import com.studio.pro.presentation.content.ContentDetailScreen
import com.studio.pro.presentation.splash.SplashScreen

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
    const val SERIES         = "series"
    const val MOVIES         = "movies"
    const val CHOOSE_PROFILE = "choose_profile"
    const val SUBSCRIPTION   = "subscription"

    fun contentDetail(id: String) = "content/$id"
    fun playerContent(id: String) = "player/content/$id"
    fun playerEpisode(id: String) = "player/episode/$id"
}

@Composable
fun AppNavigation(
    modifier: Modifier = Modifier,
    startDestination: String = Routes.LOGIN
) {
    val navController  = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val isLoggedIn     by authViewModel.isLoggedIn.collectAsStateWithLifecycle()

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
        enterTransition  = { fadeIn() + slideInHorizontally { it / 3 } },
        exitTransition   = { fadeOut() + slideOutHorizontally { -it / 3 } },
        popEnterTransition  = { fadeIn() + slideInHorizontally { -it / 3 } },
        popExitTransition   = { fadeOut() + slideOutHorizontally { it / 3 } },
    ) {



        // ── Auth ─────────────────────────────────────────────
        composable(Routes.LOGIN) {
            LoginScreen(
                onLoginSuccess   = {
                    navController.navigate(Routes.CHOOSE_PROFILE) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onRegisterClick  = { navController.navigate(Routes.REGISTER) },
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Routes.CHOOSE_PROFILE) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onLoginClick = { navController.popBackStack() },
            )
        }

        composable(Routes.CHOOSE_PROFILE) {
            LaunchedEffect(Unit) {
                authViewModel.loadCurrentUser()
            }
            val authState by authViewModel.uiState.collectAsStateWithLifecycle()
            val user = remember(authState) {
                (authState as? AuthUiState.Success)?.user
            }
            val userName = remember(user) {
                user?.displayName?.takeIf { it.isNotBlank() } ?: user?.email?.substringBefore("@")
            }
            val avatarUrl = remember(user) {
                user?.avatarUrl
            }
            ChooseProfileScreen(
                userName = userName,
                avatarUrl = avatarUrl,
                onProfileSelected = { profileName ->
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.CHOOSE_PROFILE) { inclusive = true }
                    }
                },
                onManageProfiles = {
                    navController.navigate("profile?edit=true")
                }
            )
        }

        // ── Main Screens ─────────────────────────────────────
        composable(Routes.HOME) {
            HomeScreen(
                onContentClick     = { id -> navController.navigate(Routes.contentDetail(id)) },
                onSearchClick      = { navController.navigate(Routes.SEARCH) },
                onProfileClick     = { navController.navigate(Routes.PROFILE) },
                onNavigateToSeries = { navController.navigate(Routes.SERIES) },
                onNavigateToMovies = { navController.navigate(Routes.MOVIES) },
            )
        }

        composable(Routes.SERIES) {
            CategoryScreen(
                filterType           = "Series",
                onContentClick       = { id -> navController.navigate(Routes.contentDetail(id)) },
                onBackClick          = { navController.popBackStack() }
            )
        }

        composable(Routes.MOVIES) {
            CategoryScreen(
                filterType           = "Films",
                onContentClick       = { id -> navController.navigate(Routes.contentDetail(id)) },
                onBackClick          = { navController.popBackStack() }
            )
        }

        composable(Routes.SEARCH) {
            SearchScreen(
                onContentClick = { id -> navController.navigate(Routes.contentDetail(id)) },
                onBack         = { navController.popBackStack() },
            )
        }

        composable(
            route = "profile?edit={edit}",
            arguments = listOf(navArgument("edit") {
                type = NavType.BoolType
                defaultValue = false
            })
        ) { back ->
            val startInEditMode = back.arguments?.getBoolean("edit") ?: false
            ProfileScreen(
                startInEditMode = startInEditMode,
                onBack   = { navController.popBackStack() },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToSubscription = { navController.navigate(Routes.SUBSCRIPTION) }
            )
        }

        composable(Routes.SUBSCRIPTION) {
            val authState by authViewModel.uiState.collectAsStateWithLifecycle()
            val user = (authState as? AuthUiState.Success)?.user
            com.studio.pro.presentation.subscription.SubscriptionScreen(
                onBack = { navController.popBackStack() },
                onSuccess = {
                    authViewModel.loadCurrentUser()
                    navController.popBackStack()
                },
                userEmail = user?.email ?: "",
                userName = user?.displayName ?: "User"
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
