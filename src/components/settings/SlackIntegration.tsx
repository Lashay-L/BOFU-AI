import React, { useState, useEffect } from 'react';
import { Loader2, Slack, CheckCircle, AlertCircle, ExternalLink, Settings, Bell, BellOff, RefreshCw, Info, Lock, Eye } from 'lucide-react';
import { 
  generateSlackOAuthURL,
  getSlackConnectionStatus,
  fetchSlackChannels,
  updateSlackChannel,
  toggleSlackNotifications,
  disconnectSlack,
  sendTestSlackNotification,
  checkSlackOAuthResult,
  SlackChannel,
  SlackConnectionStatus
} from '../../lib/slackService';
import { useAuth } from '../../lib/auth';

interface SlackIntegrationProps {
  className?: string;
}

export default function SlackIntegration({ className = '' }: SlackIntegrationProps) {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<SlackConnectionStatus>({ connected: false });
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [refreshingChannels, setRefreshingChannels] = useState(false);

  // Check for OAuth callback results on component mount
  useEffect(() => {
    const oauthResult = checkSlackOAuthResult();
    if (oauthResult.success) {
      // Clear URL params and refresh connection status
      window.history.replaceState({}, document.title, window.location.pathname);
      loadConnectionStatus();
    } else if (oauthResult.error) {
      setTestResult({ error: `Connection failed: ${oauthResult.error}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadConnectionStatus = async () => {
    try {
      setLoading(true);
      const status = await getSlackConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        const channelsResult = await fetchSlackChannels();
        if (channelsResult.success && channelsResult.channels) {
          setChannels(channelsResult.channels);
        } else if (channelsResult.error === 'slack_disconnected') {
          // Token expired, refresh status
          setConnectionStatus({ connected: false });
        }
      }
    } catch (error) {
      console.error('Error loading Slack connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const handleConnect = async () => {
    if (!user) return;
    
    setActionLoading('connecting');
    try {
      const oauthUrl = generateSlackOAuthURL(user.id);
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error initiating Slack OAuth:', error);
      setTestResult({ error: 'Failed to initiate Slack connection' });
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnecting');
    try {
      const success = await disconnectSlack();
      if (success) {
        setConnectionStatus({ connected: false });
        setChannels([]);
        setSelectedChannel('');
        setShowChannelSelector(false);
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to disconnect Slack' });
      }
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      setTestResult({ error: 'Failed to disconnect Slack' });
    } finally {
      setActionLoading('');
    }
  };

  const handleChannelChange = async (channelId: string) => {
    if (!channelId) return;

    setActionLoading('updating');
    try {
      const channel = channels.find(ch => ch.id === channelId);
      if (!channel) return;

      const success = await updateSlackChannel(channelId, channel.name);
      if (success) {
        setConnectionStatus(prev => ({
          ...prev,
          channel_name: channel.name
        }));
        setSelectedChannel('');
        setShowChannelSelector(false);
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to update channel selection' });
      }
    } catch (error) {
      console.error('Error updating Slack channel:', error);
      setTestResult({ error: 'Failed to update channel selection' });
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleNotifications = async () => {
    setActionLoading('toggling');
    try {
      const newEnabled = !connectionStatus.notifications_enabled;
      const success = await toggleSlackNotifications(newEnabled);
      if (success) {
        setConnectionStatus(prev => ({
          ...prev,
          notifications_enabled: newEnabled
        }));
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to update notification settings' });
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setTestResult({ error: 'Failed to update notification settings' });
    } finally {
      setActionLoading('');
    }
  };

  const handleSendTest = async () => {
    setActionLoading('testing');
    setTestResult(null);
    try {
      const result = await sendTestSlackNotification();
      setTestResult(result);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestResult({ error: 'Failed to send test notification' });
    } finally {
      setActionLoading('');
    }
  };

  const handleRefreshChannels = async () => {
    if (!connectionStatus.connected) return;
    
    setRefreshingChannels(true);
    try {
      const channelsResult = await fetchSlackChannels();
      if (channelsResult.success && channelsResult.channels) {
        setChannels(channelsResult.channels);
        setTestResult({ success: true });
      } else {
        setTestResult({ error: 'Failed to refresh channels' });
      }
    } catch (error) {
      console.error('Error refreshing channels:', error);
      setTestResult({ error: 'Failed to refresh channels' });
    } finally {
      setRefreshingChannels(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Slack className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-medium text-white">Slack Integration</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
              <Slack className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                Slack Integration
              </h3>
              <p className="text-gray-400 text-sm">Stay connected with your team</p>
            </div>
          </div>
          {connectionStatus.connected && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">Connected</span>
            </div>
          )}
        </div>

      {/* Connection Status */}
      {!connectionStatus.connected ? (
        <div className="space-y-8">
          <div className="text-center">
            <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">
              Connect your Slack workspace to receive beautiful, real-time notifications when content briefs are approved and articles are generated.
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Real-time Notifications</h4>
                  <p className="text-gray-400 text-sm">Get instant updates in your chosen Slack channel with rich formatting</p>
                </div>
              </div>
            </div>

            <div className="group p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Content Approvals</h4>
                  <p className="text-gray-400 text-sm">Never miss when briefs are approved with detailed notification cards</p>
                </div>
              </div>
            </div>

            <div className="group p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-green-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <Settings className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Article Generation</h4>
                  <p className="text-gray-400 text-sm">Stay updated when your AI articles are ready for review</p>
                </div>
              </div>
            </div>

            <div className="group p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-yellow-500/30 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                  <ExternalLink className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-2">Easy Setup</h4>
                  <p className="text-gray-400 text-sm">Simple 3-step process to get your team connected in minutes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="relative p-6 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl blur-sm"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-xl font-bold text-white">Quick Setup Guide</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <p className="text-white font-medium">Connect to Slack</p>
                    <p className="text-gray-400 text-sm">Click the button below to authorize BOFU AI</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <p className="text-white font-medium">Invite the bot to your channel</p>
                    <p className="text-gray-400 text-sm">Type <code className="bg-gray-800 px-2 py-1 rounded text-yellow-300 font-mono">/invite @BOFU AI</code> in your desired channel</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <p className="text-white font-medium">Test the integration</p>
                    <p className="text-gray-400 text-sm">Send a test notification to confirm everything works</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <div className="flex justify-center">
            <button
              onClick={handleConnect}
              disabled={actionLoading === 'connecting'}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative flex items-center gap-3">
                {actionLoading === 'connecting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Slack className="w-5 h-5" />
                )}
                <span className="text-lg">Connect to Slack</span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Connected Status */}
          <div className="relative p-6 bg-gradient-to-r from-green-500/10 via-green-400/5 to-emerald-500/10 border border-green-500/30 rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-xl blur-sm"></div>
            <div className="relative flex items-start gap-6">
              <div className="flex-shrink-0 p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-xl font-bold text-green-400">Successfully Connected</h4>
                  <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-xs font-medium">ACTIVE</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                    <p className="text-gray-400 text-sm mb-1">Workspace</p>
                    <p className="text-white font-semibold">{connectionStatus.team_name}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                    <p className="text-gray-400 text-sm mb-1">Channel</p>
                    <p className="text-white font-semibold">#{connectionStatus.channel_name}</p>
                  </div>
                  <div className="p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                    <p className="text-gray-400 text-sm mb-1">Notifications</p>
                    <div className="flex items-center gap-2">
                      {connectionStatus.notifications_enabled ? (
                        <>
                          <Bell className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-semibold">Enabled</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400 font-semibold">Disabled</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="relative p-6 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 bg-blue-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">Need Help with Notifications?</h4>
                <p className="text-gray-300 mb-3">
                  If test notifications fail, make sure the BOFU AI bot is added to your channel.
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                  <code className="text-yellow-300 font-mono">/invite @BOFU AI</code>
                  <span className="text-gray-400">in #{connectionStatus.channel_name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-xl font-bold text-white">Notification Settings</h4>
            </div>

            {/* Notification Toggle */}
            <div className="group p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-purple-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg transition-colors ${
                    connectionStatus.notifications_enabled 
                      ? 'bg-green-500/20 group-hover:bg-green-500/30' 
                      : 'bg-gray-500/20 group-hover:bg-gray-500/30'
                  }`}>
                    {connectionStatus.notifications_enabled ? (
                      <Bell className="w-6 h-6 text-green-400" />
                    ) : (
                      <BellOff className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">Slack Notifications</p>
                    <p className="text-sm text-gray-400">Receive real-time updates in your Slack channel</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  disabled={actionLoading === 'toggling'}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    connectionStatus.notifications_enabled 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 focus:ring-green-500' 
                      : 'bg-gray-600 focus:ring-gray-500'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                      connectionStatus.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Channel Selection */}
            <div className="group p-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <Settings className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-1">Notification Channel</p>
                    <p className="text-sm text-gray-400">Current: #{connectionStatus.channel_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChannelSelector(!showChannelSelector)}
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 hover:text-yellow-300 rounded-lg transition-all duration-300 font-medium"
                >
                  {showChannelSelector ? 'Cancel' : 'Change'}
                </button>
              </div>

              {showChannelSelector && (
                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                  {/* Private Channels Guide */}
                  <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-500/20 rounded-lg flex-shrink-0">
                        <Info className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-sm font-bold text-blue-400">Private Channel Access</h5>
                        <p className="text-blue-200 text-xs leading-relaxed">
                          Private channels require the bot to be manually invited. If you don't see a private channel, 
                          use <code className="bg-blue-800/50 px-1 py-0.5 rounded text-blue-300">/invite @BOFU AI</code> in that channel first.
                        </p>
                        <button
                          onClick={handleRefreshChannels}
                          disabled={refreshingChannels}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs transition-colors"
                        >
                          {refreshingChannels ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          Refresh channels
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-200">Choose Channel</label>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3 h-3" />
                        <span>{channels.length} available</span>
                      </div>
                    </div>
                    <select
                      value={selectedChannel}
                      onChange={(e) => setSelectedChannel(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Select a channel...</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          #{channel.name} {channel.is_private ? '(private)' : ''} 
                          {channel.is_member ? '' : ' (invite bot first)'}
                        </option>
                      ))}
                    </select>
                    {channels.length === 0 && (
                      <p className="text-yellow-400 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No channels found. Make sure the bot is invited to channels you want to use.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleChannelChange(selectedChannel)}
                      disabled={!selectedChannel || actionLoading === 'updating'}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-300"
                    >
                      {actionLoading === 'updating' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Update Channel'
                      )}
                    </button>
                    <button
                      onClick={() => setShowChannelSelector(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Test Notification */}
            <div className="group p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                  <Bell className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Test Integration</p>
                  <p className="text-sm text-gray-400">Verify your setup is working</p>
                </div>
              </div>
              <button
                onClick={handleSendTest}
                disabled={actionLoading === 'testing' || !connectionStatus.notifications_enabled}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:transform-none"
              >
                {actionLoading === 'testing' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Send Test
                  </>
                )}
              </button>
            </div>

            {/* Disconnect */}
            <div className="group p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl hover:border-red-500/40 transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                  <ExternalLink className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Disconnect</p>
                  <p className="text-sm text-gray-400">Remove Slack integration</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={actionLoading === 'disconnecting'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-300"
              >
                {actionLoading === 'disconnecting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Disconnect Slack'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Messages */}
      {testResult && (
        <div className={`relative p-6 rounded-xl border backdrop-blur-sm transition-all duration-500 ${
          testResult.success 
            ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
            : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              testResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <div>
              <p className={`font-semibold mb-1 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.success ? 'Success!' : 'Error'}
              </p>
              <p className={`text-sm ${testResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {testResult.success ? 'Operation completed successfully!' : testResult.error}
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}