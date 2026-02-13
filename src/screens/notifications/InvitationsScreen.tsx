import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { invitationsApi } from '../../api/invitations';
import { theme } from '../../styles/theme';

export const InvitationsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        try {
            const data = await invitationsApi.getPendingInvitations();
            setInvitations(data);
        } catch (error) {
            console.error('Failed to load invitations', error);
            Alert.alert('Error', 'Failed to load invitations');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleAccept = async (id: string, teamName: string) => {
        setProcessingId(id);
        try {
            await invitationsApi.acceptInvitation(id);
            Alert.alert('Success', `You have joined ${teamName}!`);
            loadInvitations(); // Refresh list
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept invitation');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await invitationsApi.rejectInvitation(id);
            Alert.alert('Success', 'Invitation rejected');
            loadInvitations(); // Refresh list
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to reject invitation');
        } finally {
            setProcessingId(null);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInvitations();
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={invitations}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.teamName}>{item.team.name}</Text>
                                <Text style={styles.invitedBy}>
                                    Invited by {item.inviter.firstName} {item.inviter.lastName}
                                </Text>
                            </View>
                            <View style={styles.dateContainer}>
                                <Text style={styles.dateText}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.button, styles.rejectButton]}
                                onPress={() => handleReject(item.id)}
                                disabled={!!processingId}
                            >
                                {processingId === item.id ? (
                                    <ActivityIndicator color={theme.colors.error} size="small" />
                                ) : (
                                    <Text style={styles.rejectButtonText}>Reject</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton]}
                                onPress={() => handleAccept(item.id, item.team.name)}
                                disabled={!!processingId}
                            >
                                {processingId === item.id ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.acceptButtonText}>Accept</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="mail" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No pending invitations</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...theme.shadows.small,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    teamName: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    invitedBy: {
        ...theme.typography.bodySmall,
        color: theme.colors.text.secondary,
    },
    dateContainer: {
        justifyContent: 'flex-start',
    },
    dateText: {
        ...theme.typography.caption,
        color: theme.colors.text.secondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: theme.colors.primary,
    },
    rejectButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    acceptButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    rejectButtonText: {
        color: theme.colors.error,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        ...theme.typography.body,
        color: theme.colors.text.secondary,
        marginTop: 16,
    },
});
