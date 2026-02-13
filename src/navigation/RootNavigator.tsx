import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { NetworkDebugScreen } from '../screens/debug/NetworkDebugScreen';

// Match Screens
import { MatchListScreen } from '../screens/matches/MatchListScreen';
import { CreateMatchScreen } from '../screens/matches/CreateMatchScreen';
import { MatchDetailScreen } from '../screens/matches/MatchDetailScreen';
import { EditMatchScreen } from '../screens/matches/EditMatchScreen';
import { MatchSetupScreen } from '../screens/matches/MatchSetupScreen';
import { SelectBatsmenScreen } from '../screens/matches/SelectBatsmenScreen';
import { BallScoringScreenV4 } from '../screens/matches/BallScoringScreenV4';
import { BallScoringScreenRedux } from '../screens/matches/BallScoringScreenRedux';
import { LiveMatchViewScreen } from '../screens/matches/LiveMatchViewScreen';
import { CompleteMatchScreen } from '../screens/matches/CompleteMatchScreen';
import { PublicLiveMatchScreen } from '../screens/matches/PublicLiveMatchScreen';
import { AllLiveMatchesScreen } from '../screens/matches/AllLiveMatchesScreen';

// Public Screens
import { PublicLiveViewScreen } from '../screens/public/PublicLiveViewScreen';

// Team Screens
import { TeamListScreen } from '../screens/teams/TeamListScreen';
import { CreateTeamScreen } from '../screens/teams/CreateTeamScreen';
import { TeamDetailScreen } from '../screens/teams/TeamDetailScreen';

// Profile Screen
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen
      name="NetworkDebug"
      component={NetworkDebugScreen}
      options={{ headerShown: true, title: 'Network Debug' }}
    />
    <Stack.Screen
      name="PublicLiveView"
      component={PublicLiveViewScreen}
      options={{ headerShown: true, title: 'Live Match' }}
    />
    <Stack.Screen
      name="PublicLiveMatch"
      component={PublicLiveMatchScreen}
      options={{ headerShown: true, title: 'Live Match' }}
    />
  </Stack.Navigator>
);

const MatchesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text.primary,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="MatchList"
      component={MatchListScreen}
      options={{ title: 'Matches' }}
    />
    <Stack.Screen
      name="CreateMatch"
      component={CreateMatchScreen}
      options={{ title: 'Create Match' }}
    />
    <Stack.Screen
      name="MatchDetail"
      component={MatchDetailScreen}
      options={{ title: 'Match Details' }}
    />
    <Stack.Screen
      name="EditMatch"
      component={EditMatchScreen}
      options={{ title: 'Edit Match' }}
    />
    <Stack.Screen
      name="MatchSetup"
      component={MatchSetupScreen}
      options={{ title: 'Match Setup' }}
    />
    <Stack.Screen
      name="SelectBatsmen"
      component={SelectBatsmenScreen}
      options={{ title: 'Select Players' }}
    />
    <Stack.Screen
      name="BallScoring"
      component={BallScoringScreenRedux}
      options={{ title: 'Record Ball' }}
    />
    <Stack.Screen
      name="LiveMatchView"
      component={LiveMatchViewScreen}
      options={{ title: 'Live Match' }}
    />
    <Stack.Screen
      name="CompleteMatch"
      component={CompleteMatchScreen}
      options={{ title: 'Complete Match' }}
    />
  </Stack.Navigator>
);

const TeamsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text.primary,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="TeamList"
      component={TeamListScreen}
      options={{ title: 'Teams' }}
    />
    <Stack.Screen
      name="CreateTeam"
      component={CreateTeamScreen}
      options={{ title: 'Create Team' }}
    />
    <Stack.Screen
      name="TeamDetail"
      component={TeamDetailScreen}
      options={{ title: 'Team Details' }}
    />
  </Stack.Navigator>
);

// ... imports
import { InvitationsScreen } from '../screens/notifications/InvitationsScreen';

// ... existing code ...

import { InviteAcceptScreen } from '../screens/invites/InviteAcceptScreen';
import { DeepLinkHandler } from '../components/DeepLinkHandler';
import { WidgetPreviewScreen } from '../screens/widgets/WidgetPreviewScreen';

// ... existing code ...

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text.primary,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen
      name="Invitations"
      component={InvitationsScreen}
      options={{ title: 'Team Invitations' }}
    />
    <Stack.Screen
      name="InviteAccept"
      component={InviteAcceptScreen}
      options={{ title: 'Accept Invitation' }}
    />
    <Stack.Screen
      name="WidgetPreview"
      component={WidgetPreviewScreen}
      options={{ title: 'Widget Preview' }}
    />
  </Stack.Navigator>
);

// ... existing code ...

const LiveViewStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.surface,
      },
      headerTintColor: theme.colors.text.primary,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      headerShadowVisible: false,
    }}
  >
    <Stack.Screen
      name="LiveViewHome"
      component={AllLiveMatchesScreen}
      options={{ title: 'All Matches' }}
    />
    <Stack.Screen
      name="LiveViewMatch"
      component={PublicLiveMatchScreen}
      options={{ title: 'Live Match' }}
    />
  </Stack.Navigator>
);

const AppTabs = () => (
  <>
    <DeepLinkHandler />
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'MatchesTab') {
            iconName = 'list';
          } else if (route.name === 'LiveViewTab') {
            iconName = 'activity';
          } else if (route.name === 'TeamsTab') {
            iconName = 'users';
          } else if (route.name === 'ProfileTab') {
            iconName = 'user';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="MatchesTab"
        component={MatchesStack}
        options={{
          title: 'Matches',
          tabBarLabel: 'Matches',
        }}
      />
      <Tab.Screen
        name="LiveViewTab"
        component={LiveViewStack}
        options={{
          title: 'Live View',
          tabBarLabel: 'Live View',
        }}
      />
      <Tab.Screen
        name="TeamsTab"
        component={TeamsStack}
        options={{
          title: 'Teams',
          tabBarLabel: 'Teams',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  </>
);

export const RootNavigator = () => {
  const { isSignedIn, isLoading } = useAuth();
  useNotifications(); // Initialize notifications

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return isSignedIn ? <AppTabs /> : <AuthStack />;
};
