import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { invitationsApi } from '../../api/invitations';
import { TeamLogo } from '../../components/TeamLogo';
import { Feather } from '@expo/vector-icons';

export const InviteAcceptScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
    const { token } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [invitation, setInvitation] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            const data = await invitationsApi.getInvitationByToken(token);
            setInvitation(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Invalid or expired invitation');
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async () => {
        setProcessing(true);
        try {
            await invitationsApi.acceptInvitation(invitation.id);
            Alert.alert('Success', 'You have joined the team!');
            navigation.navigate('TeamsTab');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to accept invitation');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        setProcessing(true);
        try {
            await invitationsApi.rejectInvitation(invitation.id);
            Alert.alert('Notice', 'Invitation declined');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to reject invitation');
        } finally {
            setProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!invitation) return null;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Team Invitation</Text>

                <View style={styles.teamContainer}>
                    <TeamLogo team={invitation.team} size={100} />
                    <Text style={styles.teamName}>{invitation.team.name}</Text>
                    <Text style={styles.invitedBy}>Invited by {invitation.inviter.firstName} {invitation.inviter.lastName}</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.rejectButton]}
                        onPress={handleReject}
                        disabled={processing}
                    >
                        <Text style={styles.rejectText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.acceptButton]}
                        onPress={handleAccept}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.acceptText}>Accept Invitation</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 32,
    },
    teamContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    teamName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 16,
        color: '#1a1a1a',
        textAlign: 'center',
    },
    invitedBy: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#007AFF',
    },
    rejectButton: {
        backgroundColor: '#f0f0f0',
    },
    acceptText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    rejectText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
});
