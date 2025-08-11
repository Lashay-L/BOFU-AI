import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Settings,
  History,
  Sparkles,
  BookOpen,
  Lightbulb,
  Zap,
  RotateCcw,
  Send,
  Mic,
  MicOff,
  PaperclipIcon,
  Brain,
  Wand2,
  FileText,
  Edit3,
  Eye,
  CheckCircle,
  Clock,
  Star,
  TrendingUp,
  Target,
  ChevronDown,
  Plus,
  Archive,
  Trash2,
  Bot,
  User,
  Circle,
  MessageCircle,
  ChevronRight,
  RefreshCw,
  MoreHorizontal,
  Layers,
  ShieldCheck,
  Activity,
  Layout,
  Cpu,
  Workflow,
  Gauge,
  Network
} from 'lucide-react';
import { Product, Message, ChatStatus } from '../../types/chat';
import { Product as ProductType } from '../../types';
import { chatService, ChatConversation, ChatMessage } from '../../services/chatService';
import { supabase } from '../../lib/supabase';

interface ArticleAICoPilotProps {
  isVisible: boolean;
  onToggle: () => void;
  articleContent: string;
  articleTitle: string;
  productId?: string; // Optional product ID to connect to knowledge base
  authorCompanyName?: string; // Company name of the article author to filter products
  onSuggestion?: (suggestion: string) => void;
  className?: string;
}

interface SuggestionTemplate {
  id: string;
  title: string;
  icon: string;
  description: string;
  prompt: string;
  category: 'content' | 'style' | 'seo' | 'engagement';
}

const suggestionTemplates: SuggestionTemplate[] = [
  {
    id: 'strategic-analysis',
    title: 'Strategic Content Analysis',
    icon: 'target',
    description: 'Analyze content effectiveness and strategic positioning',
    prompt: 'Perform a comprehensive strategic analysis of this article, evaluating its positioning, messaging effectiveness, and competitive advantages. Suggest improvements for maximum market impact.',
    category: 'content'
  },
  {
    id: 'narrative-architecture',
    title: 'Narrative Architecture',
    icon: 'layers',
    description: 'Optimize story structure and information hierarchy',
    prompt: 'Review the narrative architecture of this article. Analyze the flow of information, story progression, and structural elements to create a more compelling and logical reader journey.',
    category: 'style'
  },
  {
    id: 'performance-optimization',
    title: 'Performance Optimization',
    icon: 'trending-up',
    description: 'Enhance for search visibility and engagement metrics',
    prompt: 'Optimize this article for peak performance across search engines, social media, and user engagement metrics. Focus on technical SEO, semantic structure, and conversion optimization.',
    category: 'seo'
  },
  {
    id: 'proof-validation',
    title: 'Proof & Validation',
    icon: 'shield-check',
    description: 'Strengthen credibility with evidence and examples',
    prompt: 'Enhance this article with compelling proof points, case studies, data validation, and practical examples that build trust and demonstrate real-world application.',
    category: 'content'
  },
  {
    id: 'conversion-psychology',
    title: 'Conversion Psychology',
    icon: 'brain-circuit',
    description: 'Apply behavioral triggers and persuasion principles',
    prompt: 'Apply advanced conversion psychology principles to optimize this article for decision-making, trust-building, and action-taking. Focus on psychological triggers and behavioral science.',
    category: 'engagement'
  },
  {
    id: 'cognitive-clarity',
    title: 'Cognitive Clarity',
    icon: 'brain',
    description: 'Optimize for cognitive load and comprehension',
    prompt: 'Enhance cognitive clarity by optimizing information processing, reducing mental friction, and improving comprehension speed. Focus on cognitive load theory and readability science.',
    category: 'style'
  }
];

// Icon mapping for dynamic rendering
const iconMap: Record<string, React.ComponentType<any>> = {
  'target': Target,
  'layers': Layers,
  'trending-up': TrendingUp,
  'shield-check': ShieldCheck,
  'brain-circuit': Activity,
  'brain': Brain,
  'zap': Zap,
  'file-text': FileText,
  'layout': Layout,
  'cpu': Cpu,
  'workflow': Workflow,
  'gauge': Gauge,
  'network': Network
};

const getIcon = (iconName: string) => iconMap[iconName] || Target;

// Helper function to call OpenAI Edge Functions securely
const callOpenAICopilotEdgeFunction = async (action: string, params: any) => {
  const { data, error } = await supabase.functions.invoke('openai-copilot', {
    body: { action, ...params }
  });

  if (error) {
    console.error(`[ArticleAICoPilot] Edge Function error for ${action}:`, error);
    throw new Error(error.message || `Failed to execute ${action}`);
  }

  if (!data.success) {
    console.error(`[ArticleAICoPilot] Edge Function failed for ${action}:`, data.error);
    throw new Error(data.error || `${action} failed`);
  }

  return data.data;
};

const VITE_UNIVERSAL_ASSISTANT_ID = import.meta.env.VITE_UNIVERSAL_ASSISTANT_ID;

const ArticleAICoPilot: React.FC<ArticleAICoPilotProps> = ({
  isVisible,
  onToggle,
  articleContent,
  articleTitle,
  productId,
  authorCompanyName,
  onSuggestion,
  className = ''
}) => {
  // Component state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isListening, setIsListening] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [assistantThreadId, setAssistantThreadId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [view, setView] = useState<'chat' | 'history' | 'templates'>('templates');
  
  // Product selection state
  const [availableProducts, setAvailableProducts] = useState<ProductType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // Load conversation history and products
  useEffect(() => {
    if (isVisible) {
      loadConversations();
      loadProducts();
    }
  }, [isVisible, authorCompanyName]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProductDropdown]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = async () => {
    try {
      setIsRefreshingHistory(true);
      const loadedConversations = await chatService.getConversations();
      setConversations(loadedConversations.filter(conv => 
        conv.title.includes('Article Assistant') || conv.title.includes(articleTitle)
      ));
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    if (conversationId === currentConversationId || isLoadingConversation) return;
    
    try {
      setIsLoadingConversation(true);
      setView('chat');
      setShowTemplates(false);
      
      const chatMessages = await chatService.getMessages(conversationId);
      const uiMessages: Message[] = chatMessages.map(msg => ({
        id: msg.id,
        text: msg.content,
        sender: msg.role,
        timestamp: new Date(msg.created_at),
        type: 'text'
      }));
      
      setMessages(uiMessages);
      setCurrentConversationId(conversationId);
      
      // Reset assistant thread for the new conversation
      setAssistantThreadId(null);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setAssistantThreadId(null);
    setView('templates');
    setShowTemplates(true);
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatService.archiveConversation(conversationId);
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (conversationId === currentConversationId) {
        handleNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await chatService.clearAllConversations();
      setConversations([]);
      handleNewConversation();
    } catch (error) {
      console.error('Failed to clear all conversations:', error);
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      let query = supabase
        .from('products')
        .select('id, name, description, openai_vector_store_id, created_at, user_id');

      // ALWAYS filter products by company - only show products from the same company
      if (authorCompanyName) {
        console.log(`🏢 Filtering products for company: "${authorCompanyName}"`);
        
        // First get users from that company, then filter products by those users
        const { data: companyUsers, error: usersError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('company_name', authorCompanyName);

        if (usersError) {
          console.error('Error loading company users:', usersError);
          setAvailableProducts([]);
          return;
        } 
        
        if (companyUsers && companyUsers.length > 0) {
          const userIds = companyUsers.map(user => user.id);
          query = query.in('user_id', userIds);
          console.log(`🏢 Found ${userIds.length} users for company "${authorCompanyName}"`);
        } else {
          console.log(`🏢 No users found for company "${authorCompanyName}", showing no products`);
          setAvailableProducts([]);
          return;
        }
      } else {
        console.log('🏢 No company name provided, cannot load products');
        setAvailableProducts([]);
        return;
      }

      const { data: products, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Only show products from the same company
      setAvailableProducts(products || []);
      console.log(`📦 Loaded ${(products || []).length} company products:`, 
        (products || []).map(p => ({ 
          name: p.name, 
          id: p.id, 
          hasVectorStore: !!p.openai_vector_store_id 
        }))
      );
      
      // Auto-select provided productId if it exists and belongs to the company
      if (productId && products && products.length > 0) {
        const matchingProduct = products.find(p => p.id === productId);
        if (matchingProduct) {
          console.log(`✅ Auto-selected product: ${matchingProduct.name}`);
          setSelectedProduct(matchingProduct);
        } else {
          console.log(`❌ Product with ID ${productId} not found in company products`);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setAvailableProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleProductSelect = (product: ProductType | null) => {
    console.log('🎯 Product selected in copilot:', product ? {
      id: product.id,
      name: product.name,
      vectorStoreId: product.openai_vector_store_id
    } : 'No product (Basic AI mode)');
    
    setSelectedProduct(product);
    setShowProductDropdown(false);
    
    // Reset thread when switching products to start fresh conversation
    if (product?.id !== selectedProduct?.id) {
      console.log('🔄 Resetting thread due to product change');
      setAssistantThreadId(null);
      setMessages([]);
    }
  };

  const createNewConversation = async (firstMessage?: string) => {
    try {
      const title = firstMessage 
        ? chatService.generateConversationTitle(firstMessage, 'Article Assistant')
        : `Article Assistant: ${articleTitle.substring(0, 30)}...`;
        
      const conversation = await chatService.createConversation({
        title,
        product_id: selectedProduct?.id
      });
      
      if (conversation) {
        setCurrentConversationId(conversation.id);
        setConversations(prev => [conversation, ...prev]);
      }
      
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setInputValue('');
    setShowTemplates(false);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Create conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        const conversation = await createNewConversation(text);
        conversationId = conversation?.id || null;
      }

      // Save user message
      if (conversationId) {
        await chatService.addMessage({
          conversation_id: conversationId,
          role: 'user',
          content: text,
          metadata: { 
            articleTitle, 
            context: 'article-editing',
            productId: selectedProduct?.id,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Generate AI response using OpenAI
      const aiResponse = await generateAIResponse(text, articleContent);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        text: aiResponse,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message
      if (conversationId) {
        await chatService.addMessage({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse,
          metadata: { 
            articleTitle, 
            context: 'article-editing',
            productId: selectedProduct?.id,
            timestamp: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'I apologize, but I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (userInput: string, content: string): Promise<string> => {
    try {
      // Use selected product, just like ChatWindow does
      if (!selectedProduct) {
        return "Please select a product with a knowledge base to get AI assistance.";
      }

      // Check if the product has a valid vector store
      if (!selectedProduct.openai_vector_store_id) {
        return `The selected product "${selectedProduct.name}" doesn't have a knowledge base configured. Please select a different product or contact your administrator.`;
      }

      console.log('🧠 Using product:', selectedProduct.name, 'with vector store:', selectedProduct.openai_vector_store_id);
      
      // Use direct OpenAI calls exactly like ChatWindow
      let threadIdToUse = assistantThreadId;
      if (!threadIdToUse) {
        console.log('Creating new thread with vector store...');
        
        // Configure thread with vector store exactly like ChatWindow
        const threadConfig: any = {
          tool_resources: {
            file_search: {
              vector_store_ids: [selectedProduct.openai_vector_store_id],
            },
          },
        };
        console.log('Creating thread with vector store:', selectedProduct.openai_vector_store_id);
        
        try {
          const threadResponse = await callOpenAICopilotEdgeFunction('create_thread', {
            vectorStoreId: selectedProduct.openai_vector_store_id
          });
          threadIdToUse = threadResponse.id;
          setAssistantThreadId(threadIdToUse);
          console.log('Thread created:', threadIdToUse);
        } catch (vectorError: any) {
          console.error('Vector store error:', vectorError);
          if (vectorError.message && vectorError.message.includes('not found')) {
            return `The knowledge base for "${selectedProduct.name}" is no longer available. Please contact your administrator to recreate the knowledge base or select a different product.`;
          }
          throw vectorError;
        }
      }

      console.log('Sending message and creating run...');
      console.log('🔍 Debug - Assistant ID:', VITE_UNIVERSAL_ASSISTANT_ID);
      console.log('🔍 Debug - Thread ID:', threadIdToUse);
      console.log('🔍 Debug - Message:', userInput.trim());
      
      const run = await callOpenAICopilotEdgeFunction('send_message', {
        threadId: threadIdToUse,
        message: userInput.trim(),
        assistantId: VITE_UNIVERSAL_ASSISTANT_ID
      });

      console.log('Waiting for run completion...');
      const maxAttempts = 60;
      let attempts = 0;
      let runStatus = run.status;

      while (runStatus === 'in_progress' || runStatus === 'queued') {
        if (attempts >= maxAttempts) {
          console.error('Run timeout');
          return 'The request timed out. Please try again.';
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const runCheck = await callOpenAICopilotEdgeFunction('get_run_status', {
          threadId: threadIdToUse,
          runId: run.id
        });
        runStatus = runCheck.status;
        attempts++;
        console.log(`Run status: ${runStatus} (attempt ${attempts})`);
      }

      if (runStatus === 'completed') {
        console.log('Run completed, fetching messages...');
        const messages = await callOpenAICopilotEdgeFunction('get_messages', {
          threadId: threadIdToUse
        });
        
        if (messages.data.length > 0) {
          const assistantMessage = messages.data.find(
            (msg) => msg.role === 'assistant' && msg.run_id === run.id
          );

          if (assistantMessage && assistantMessage.content.length > 0) {
            const textContent = assistantMessage.content.find(
              (content) => content.type === 'text'
            );

            if (textContent && 'text' in textContent) {
              const assistantText = textContent.text.value;
              console.log('Assistant response:', assistantText);
              return assistantText;
            } else {
              console.error('Assistant response is not text content');
              return 'The assistant returned an unexpected response format.';
            }
          } else {
            console.error('Assistant message has no content');
            return 'The assistant response was empty.';
          }
        } else {
          console.error('No assistant messages found');
          return 'No response received from the assistant.';
        }
      } else {
        console.error(`Run failed with status: ${runStatus}`);
        return 'The assistant encountered an error while processing your request.';
      }
    } catch (error) {
      console.error('AI Response Error:', error);
      return "I'm currently experiencing connectivity issues. Please try again.";
    }
  };

  const handleTemplateClick = (template: SuggestionTemplate) => {
    const contextualPrompt = `${template.prompt}\n\nArticle Title: "${articleTitle}"\n\nCurrent Content: ${articleContent.substring(0, 500)}...`;
    setView('chat');
    setShowTemplates(false);
    handleSendMessage(contextualPrompt);
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? suggestionTemplates 
    : suggestionTemplates.filter(t => t.category === selectedCategory);

  

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`fixed right-0 top-0 h-full z-40 ${className}`}
          style={{ width: '650px' }}
        >
        {/* Main Container */}
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700 shadow-2xl">
          {/* Simple Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 right-0 w-24 h-24 bg-blue-500/3 rounded-full blur-2xl"></div>
          </div>

          {/* Header */}
          <motion.div 
            className="relative p-6 border-b border-gray-700/50 bg-gray-800/50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  className="relative p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 via-blue-500/15 to-indigo-500/20 border border-white/10 shadow-lg backdrop-blur-sm"
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/5 to-blue-400/5 animate-pulse"></div>
                  <Brain className="w-6 h-6 text-white relative z-10" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Strategic AI Co-Pilot
                    </h2>
                    {(selectedProduct || productId) && (
                      <motion.div 
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 rounded-full text-xs font-semibold border border-emerald-400/30 shadow-lg"
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50"></div>
                        KNOWLEDGE ENHANCED
                      </motion.div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    {(selectedProduct || productId) ? 'Advanced content intelligence with product expertise' : 'Professional content optimization assistant'}
                  </p>
                </motion.div>
              </div>
              
              <div className="flex items-center space-x-3">
                <motion.button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all duration-300 border border-gray-600"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <History className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  onClick={onToggle}
                  className="p-3 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-300 transition-all duration-300 border border-gray-600 hover:border-red-400/30"
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>

              {/* Product Knowledge Base Selector */}
              <motion.div 
                className="relative p-6 border-b border-gray-700/50 bg-gray-800/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-200 mb-1">Knowledge Base Selection</h3>
                  <p className="text-xs text-gray-400">Choose your product context for enhanced AI assistance</p>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    className="w-full group flex items-center justify-between px-5 py-4 bg-gray-800 border border-gray-600 rounded-2xl text-white hover:border-purple-400/50 focus:ring-2 focus:ring-purple-400/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    disabled={isLoadingProducts}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`relative w-3 h-3 rounded-full ${
                        selectedProduct ? 'bg-emerald-400' : 'bg-gray-500'
                      }`}>
                        {selectedProduct && (
                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium">
                          {isLoadingProducts ? 'Scanning knowledge bases...' :
                           selectedProduct ? selectedProduct.name : 
                           'Select Knowledge Base'}
                        </div>
                        {selectedProduct && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            Enhanced AI with product expertise
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-white ${
                      showProductDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>

                  <AnimatePresence>
                    {showProductDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto"
                      >
                        {/* No KB Option */}
                        <button
                          onClick={() => handleProductSelect(null)}
                          className={`w-full px-6 py-4 text-left hover:bg-gray-700 transition-all duration-300 border-b border-gray-700 first:rounded-t-2xl ${
                            !selectedProduct ? 'bg-purple-500/20 text-purple-300' : 'text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${!selectedProduct ? 'bg-purple-400' : 'bg-gray-500'}`} />
                            <div>
                              <div className="text-sm font-semibold">Standard AI Assistant</div>
                              <div className="text-xs text-gray-400 mt-0.5">General content optimization without product context</div>
                            </div>
                          </div>
                        </button>

                        {/* Product Options */}
                        {availableProducts.map((product, index) => (
                          <button
                            key={product.id}
                            onClick={() => handleProductSelect(product)}
                            className={`w-full px-6 py-4 text-left hover:bg-gray-700 transition-all duration-300 border-b border-gray-700 last:border-b-0 last:rounded-b-2xl ${
                              selectedProduct?.id === product.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`relative w-3 h-3 rounded-full ${
                                selectedProduct?.id === product.id ? 'bg-emerald-400' : 'bg-blue-400'
                              }`}>
                                {selectedProduct?.id === product.id && (
                                  <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-semibold">{product.name}</div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {product.description || 'Advanced product knowledge base with AI context'}
                                </div>
                              </div>
                              {product.openai_vector_store_id && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                                  <Cpu className="w-3 h-3" />
                                  AI
                                </div>
                              )}
                            </div>
                          </button>
                        ))}

                        {availableProducts.length === 0 && !isLoadingProducts && (
                          <div className="px-6 py-8 text-center text-gray-400 rounded-2xl">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-gray-500" />
                            </div>
                            <div className="text-sm font-medium mb-1">No Knowledge Bases Available</div>
                            <div className="text-xs text-gray-500">Configure product knowledge bases to unlock advanced AI features</div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              

              {/* Content Area */}
              <div className="flex-1 flex flex-col min-h-0">
                {showTemplates ? (
                  <motion.div 
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    

                    
                  </motion.div>
                ) : (
                  /* Chat Messages */
                  <motion.div 
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {messages.length === 0 ? (
                      <motion.div 
                        className="text-center py-8"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                          <MessageSquare className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Start a Conversation</h3>
                        <p className="text-sm text-gray-400">Ask me anything about your article!</p>
                      </motion.div>
                    ) : (
                      <>
                        {messages.map((message, index) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                message.sender === 'user'
                                  ? 'bg-gradient-to-br from-purple-500/80 to-blue-500/80 text-white'
                                  : message.type === 'error'
                                  ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-300 border border-red-500/30'
                                  : 'bg-gradient-to-br from-gray-800/80 to-gray-900/60 text-gray-100 border border-gray-700/40'
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{message.text}</p>
                              <p className="text-xs opacity-70 mt-2">
                                {message.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                          >
                            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/60 rounded-2xl px-4 py-3 border border-gray-700/40">
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.div
                                      key={i}
                                      className="w-2 h-2 bg-purple-400 rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">AI is thinking...</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Advanced Input Area */}
              <motion.div 
                className="border-t border-gray-700/50 p-6 bg-gray-800/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {!showTemplates && (
                  <motion.button
                    onClick={() => setShowTemplates(true)}
                    className="w-full mb-4 px-4 py-3 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 hover:text-white hover:border-purple-300/50 transition-all duration-300 text-sm font-semibold"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      <span>Show AI Optimization Tools</span>
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                  </motion.button>
                )}
                
                <div className="relative">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 relative group">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask strategic questions about your content..."
                        className="w-full px-6 py-4 pl-14 pr-24 bg-gray-800 border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300"
                        disabled={isLoading}
                      />
                      
                      {/* Input icon */}
                      <div className="absolute left-5 top-1/2 transform -translate-y-1/2">
                        <div className="p-1 rounded-lg bg-purple-500/20">
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                        </div>
                      </div>
                      
                      {/* Input controls */}
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                        {recognitionRef.current && (
                          <motion.button
                            onClick={handleVoiceInput}
                            className={`p-2.5 rounded-xl transition-all duration-300 ${
                              isListening 
                                ? 'bg-red-500/20 text-red-400 border border-red-400/30' 
                                : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 border border-gray-600'
                            }`}
                            whileHover={{ scale: 1.1, y: -1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          </motion.button>
                        )}
                        
                        <motion.button
                          onClick={() => handleSendMessage()}
                          disabled={!inputValue.trim() || isLoading}
                          className="p-2.5 rounded-xl bg-purple-500/30 text-white hover:bg-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 border border-purple-400/30 hover:border-purple-300/50 shadow-lg"
                          whileHover={{ scale: 1.1, y: -1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Send className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI status indicator */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span>AI Assistant Ready</span>
                      {selectedProduct && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Knowledge Enhanced</span>
                        </>
                      )}
                    </div>
                    <div className="text-gray-500">
                      Press Enter to send
                    </div>
                  </div>
                </div>
              </motion.div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ArticleAICoPilot;