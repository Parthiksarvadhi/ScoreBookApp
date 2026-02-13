import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { teamsApi } from '../../api/teams';
import { invitationsApi } from '../../api/invitations';
import { Team, Player } from '../../types';
import { TeamLogo } from '../../components/TeamLogo';
import { ContactPickerModal } from '../../components/ContactPickerModal';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../api/client';
import * as SMS from 'expo-sms';
import { Feather } from '@expo/vector-icons';

export const TeamDetailScreen: React.FC<{ route: any; navigation: any }> = ({
    route,
    navigation,
}) => {
    const { teamId } = route.params;
    const [team, setTeam] = useState<Team | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Edit Team State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editShortName, setEditShortName] = useState('');
    const [editLogo, setEditLogo] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Add Player State
    const [showAddPlayer, setShowAddPlayer] = useState(false);
    const [importMethod, setImportMethod] = useState<'manual' | 'contacts' | 'invite'>('manual');
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerPhone, setNewPlayerPhone] = useState('');
    const [newPlayerJersey, setNewPlayerJersey] = useState('');
    const [newPlayerRole, setNewPlayerRole] = useState<'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper'>('batsman');
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

    useEffect(() => {
        loadTeamData();
    }, []);

    const loadTeamData = async () => {
        try {
            const teamData = await teamsApi.getTeam(teamId);
            setTeam(teamData);
            setEditName(teamData.name);
            setEditShortName(teamData.shortName);
            setEditLogo(teamData.logo || '');

            const playersData = await teamsApi.getTeamPlayers(teamId);
            setPlayers(playersData);
        } catch (error) {
            Alert.alert('Error', 'Failed to load team details');
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setEditLogo(result.assets[0].uri);
        }
    };

    const handleUpdateTeam = async () => {
        if (!editName.trim() || !editShortName.trim()) {
            Alert.alert('Error', 'Name and Short Name are required');
            return;
        }

        setIsSaving(true);
        try {
            let finalLogoUrl = editLogo;

            // If logo is a local file (newly selected), upload it
            if (editLogo && !editLogo.startsWith('http') && !editLogo.startsWith('/')) {
                try {
                    const uploadedUrl = await teamsApi.uploadImage(editLogo);
                    finalLogoUrl = uploadedUrl;
                } catch (uploadError) {
                    console.error("Upload failed", uploadError);
                    Alert.alert('Warning', 'Image upload failed, saving team details without updating logo');
                    // If upload fails, keep the old logo if it was remote, or empty if it was local only?
                    // Actually better to just not update the logo field if upload failed, 
                    // or alert user. For now, let's proceed with old logo if available or empty.
                    finalLogoUrl = team?.logo || '';
                }
            }

            await teamsApi.updateTeam(teamId, {
                name: editName,
                shortName: editShortName,
                logo: finalLogoUrl
            });

            setTeam(prev => prev ? {
                ...prev,
                name: editName,
                shortName: editShortName,
                logo: finalLogoUrl
            } : null);

            setIsEditing(false);
            Alert.alert('Success', 'Team updated successfully');
        } catch (error: any) {
            Alert.alert('Error', 'Failed to update team');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditPlayer = (player: Player) => {
        setEditingPlayerId(player.id);
        setNewPlayerName(player.name);
        setNewPlayerJersey(player.jerseyNumber?.toString() || '');
        setNewPlayerRole(player.role as any);
        setShowAddPlayer(true);
    };

    const handleDeletePlayer = (playerId: string) => {
        Alert.alert(
            'Remove Player',
            'Are you sure you want to remove this player?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await teamsApi.deletePlayer(teamId, playerId);
                            const updatedPlayers = await teamsApi.getTeamPlayers(teamId);
                            setPlayers(updatedPlayers);
                            Alert.alert('Success', 'Player removed');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove player');
                        }
                    }
                }
            ]
        );
    };

    const closePlayerModal = () => {
        setShowAddPlayer(false);
        setEditingPlayerId(null);
        setImportMethod('manual');
        setNewPlayerName('');
        setNewPlayerPhone('');
        setNewPlayerJersey('');
        setNewPlayerRole('batsman');
    };

    const handleAddOrUpdatePlayer = async () => {
        if (importMethod === 'invite') {
            if (!newPlayerPhone.trim()) {
                Alert.alert('Error', 'Phone number is required');
                return;
            }
            setIsSaving(true);
            try {
                // Remove spaces and non-numeric chars for backend, but keep +
                const finalPhone = newPlayerPhone.replace(/[^0-9+]/g, '');

                const response = await invitationsApi.invitePlayer(teamId, finalPhone);

                // Check if backend says this is a new user who needs an SMS
                if (response.isNewUser && response.inviteLink) {
                    const isAvailable = await SMS.isAvailableAsync();
                    if (isAvailable) {
                        const { result } = await SMS.sendSMSAsync(
                            [finalPhone],
                            `You have been invited to join ${response.teamName || 'a team'} on ScoreBook. Join here: ${response.inviteLink}`
                        );
                        if (result === 'sent') {
                            Alert.alert('Success', 'Invitation sent via SMS!');
                        } else {
                            // Cancelled or failed
                            // Alert.alert('Notice', 'SMS invitation was cancelled.');
                        }
                    } else {
                        Alert.alert('Notice', 'SMS not available. Please share this link: ' + response.inviteLink);
                    }
                } else {
                    Alert.alert('Success', 'Invitation sent successfully');
                }

                closePlayerModal();
            } catch (error: any) {
                Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (!newPlayerName.trim()) {
            Alert.alert('Error', 'Player name is required');
            return;
        }

        // Check for duplicates (exclude self if editing)
        const isDuplicate = players.some(p =>
            p.name.trim().toLowerCase() === newPlayerName.trim().toLowerCase() &&
            p.id !== editingPlayerId
        );

        if (isDuplicate) {
            Alert.alert('Error', 'Player name already exists in this team');
            return;
        }

        setIsSaving(true);
        try {
            if (editingPlayerId) {
                await teamsApi.updatePlayer(teamId, editingPlayerId, {
                    name: newPlayerName,
                    role: newPlayerRole,
                    jerseyNumber: parseInt(newPlayerJersey) || 0
                });
                Alert.alert('Success', 'Player updated successfully');
            } else {
                await teamsApi.addPlayer(teamId, {
                    name: newPlayerName,
                    role: newPlayerRole,
                    jerseyNumber: parseInt(newPlayerJersey) || 0
                });
                Alert.alert('Success', 'Player added successfully');
            }

            // Refresh players
            const updatedPlayers = await teamsApi.getTeamPlayers(teamId);
            setPlayers(updatedPlayers);

            closePlayerModal();
        } catch (error: any) {
            Alert.alert('Error', `Failed to ${editingPlayerId ? 'update' : 'add'} player`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    if (!team) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Team not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Team Header Card */}
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TeamLogo team={team} size={64} style={{ marginRight: 16 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.teamName}>{team.name}</Text>
                            <Text style={styles.teamShortName}>{team.shortName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsEditing(true)}
                    >
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.statsText}>{players.length} Players</Text>
            </View>

            {/* Players List */}
            <View style={styles.listContainer}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Squad</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                            setEditingPlayerId(null);
                            setNewPlayerName('');
                            setNewPlayerJersey('');
                            setNewPlayerRole('batsman');
                            setImportMethod('manual');
                            setShowAddPlayer(true);
                        }}
                    >
                        <Text style={styles.addButtonText}>+ Add Player</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={players}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.playerItem}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.playerName}>{item.name}</Text>
                                <Text style={styles.playerRole}>{item.role}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {item.jerseyNumber ? (
                                    <Text style={[styles.jerseyNumber, { marginRight: 12 }]}>#{item.jerseyNumber}</Text>
                                ) : null}
                                <TouchableOpacity
                                    onPress={() => handleEditPlayer(item)}
                                    style={{ padding: 8 }}
                                >
                                    <Feather name="edit-2" size={18} color="#007AFF" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleDeletePlayer(item.id)}
                                    style={{ padding: 8 }}
                                >
                                    <Feather name="trash-2" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No players added yet</Text>
                    }
                />
            </View>

            {/* Edit Team Modal */}
            <Modal visible={isEditing} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Team</Text>

                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <TouchableOpacity onPress={pickImage} style={{ position: 'relative' }}>
                                <TeamLogo
                                    team={{ name: editName || 'Team', logo: editLogo }}
                                    size={80}
                                />
                                <View style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    backgroundColor: '#007AFF',
                                    borderRadius: 12,
                                    padding: 6,
                                    borderWidth: 2,
                                    borderColor: '#fff'
                                }}>
                                    <Feather name="camera" size={14} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ marginTop: 8, color: '#007AFF', fontSize: 14 }}>Change Logo</Text>
                        </View>

                        <Text style={styles.label}>Team Name</Text>
                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter team name"
                        />

                        <Text style={styles.label}>Short Name (e.g. IND)</Text>
                        <TextInput
                            style={styles.input}
                            value={editShortName}
                            onChangeText={setEditShortName}
                            placeholder="Enter short name"
                            maxLength={4}
                            autoCapitalize="characters"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsEditing(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleUpdateTeam}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add/Edit Player Modal */}
            <Modal visible={showAddPlayer} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingPlayerId ? 'Edit Player' : (importMethod === 'invite' ? 'Invite Player' : 'Add Player')}
                        </Text>

                        {/* Import Method Selection - Only show for new players */}
                        {!editingPlayerId && (
                            <View style={styles.methodContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.methodButton,
                                        importMethod === 'manual' && styles.methodButtonActive
                                    ]}
                                    onPress={() => setImportMethod('manual')}
                                >
                                    <Feather
                                        name="edit-3"
                                        size={18}
                                        color={importMethod === 'manual' ? '#007AFF' : '#666'}
                                    />
                                    <Text style={[
                                        styles.methodButtonText,
                                        importMethod === 'manual' && styles.methodButtonTextActive
                                    ]}>
                                        Manual Entry
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.methodButton,
                                        importMethod === 'contacts' && styles.methodButtonActive
                                    ]}
                                    onPress={() => setImportMethod('contacts')}
                                >
                                    <Feather
                                        name="users"
                                        size={18}
                                        color={importMethod === 'contacts' ? '#007AFF' : '#666'}
                                    />
                                    <Text style={[
                                        styles.methodButtonText,
                                        importMethod === 'contacts' && styles.methodButtonTextActive
                                    ]}>
                                        Contacts
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.methodButton,
                                        importMethod === 'invite' && styles.methodButtonActive
                                    ]}
                                    onPress={() => setImportMethod('invite')}
                                >
                                    <Feather
                                        name="send"
                                        size={18}
                                        color={importMethod === 'invite' ? '#007AFF' : '#666'}
                                    />
                                    <Text style={[
                                        styles.methodButtonText,
                                        importMethod === 'invite' && styles.methodButtonTextActive
                                    ]}>
                                        Invite
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Contact Selection Button */}
                        {!editingPlayerId && (importMethod === 'contacts' || importMethod === 'invite') && (
                            <TouchableOpacity
                                style={styles.selectContactButton}
                                onPress={() => setShowContactPicker(true)}
                            >
                                <Feather name="user-plus" size={20} color="#007AFF" />
                                <Text style={styles.selectContactButtonText}>
                                    {importMethod === 'invite' ? 'Select from Contacts' : 'Select Contact'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {importMethod !== 'invite' && (
                            <>
                                <Text style={styles.label}>Player Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPlayerName}
                                    onChangeText={setNewPlayerName}
                                    placeholder="Enter player name"
                                />
                            </>
                        )}

                        {(!editingPlayerId && (importMethod === 'contacts' || importMethod === 'invite')) && (
                            <>
                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPlayerPhone}
                                    onChangeText={setNewPlayerPhone}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                />
                            </>
                        )}

                        {importMethod !== 'invite' && (
                            <>
                                <Text style={styles.label}>Jersey Number</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPlayerJersey}
                                    onChangeText={setNewPlayerJersey}
                                    placeholder="Enter jersey number"
                                    keyboardType="numeric"
                                    maxLength={3}
                                />

                                <Text style={styles.label}>Role</Text>
                                <View style={styles.roleContainer}>
                                    {['batsman', 'bowler', 'all-rounder', 'wicket-keeper'].map((role) => (
                                        <TouchableOpacity
                                            key={role}
                                            style={[
                                                styles.roleButton,
                                                newPlayerRole === role && styles.roleButtonActive
                                            ]}
                                            onPress={() => setNewPlayerRole(role as any)}
                                        >
                                            <Text style={[
                                                styles.roleButtonText,
                                                newPlayerRole === role && styles.roleButtonTextActive
                                            ]}>
                                                {role}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={closePlayerModal}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleAddOrUpdatePlayer}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.saveButtonText}>
                                        {editingPlayerId ? 'Save Changes' : (importMethod === 'invite' ? 'Send Invitation' : 'Add Player')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Contact Picker Modal */}
            <ContactPickerModal
                visible={showContactPicker}
                onClose={() => setShowContactPicker(false)}
                onSelectContact={(contact) => {
                    setNewPlayerName(contact.name);
                    // Sanitize phone number: keep only digits and +
                    const sanitizedPhone = contact.phone?.replace(/[^0-9+]/g, '') || '';
                    setNewPlayerPhone(sanitizedPhone);
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#999',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    teamName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    teamShortName: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    editButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    editButtonText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    statsText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    listContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    addButton: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    addButtonText: {
        color: '#34C759',
        fontWeight: '600',
        fontSize: 14,
    },
    playerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    playerName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    playerRole: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    jerseyNumber: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    roleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    roleButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    roleButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    roleButtonText: {
        fontSize: 12,
        color: '#666',
    },
    roleButtonTextActive: {
        color: '#fff',
    },
    // Contact Import Styles
    methodContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    methodButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    methodButtonActive: {
        backgroundColor: '#E8F5FF',
        borderColor: '#007AFF',
    },
    methodButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    methodButtonTextActive: {
        color: '#007AFF',
    },
    selectContactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#E8F5FF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    selectContactButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#007AFF',
    },
});
