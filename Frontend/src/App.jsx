import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://chatapp-xkma.onrender.com");

const INITIAL_USERS = [
  { id: 1, name: "Rahul Tiwari", avatar: "https://i.pravatar.cc/150?img=11", isOnline: true },
  { id: 2, name: "Simran Kaur", avatar: "https://i.pravatar.cc/150?img=5", isOnline: false },
  { id: 3, name: "Aman Gupta", avatar: "https://i.pravatar.cc/150?img=12", isOnline: true },
  { id: 4, name: "Priya Sharma", avatar: "https://i.pravatar.cc/150?img=9", isOnline: false }
];

const EMOJIS = ['😀', '😂', '🤣', '😊', '😍', '😎', '🙏', '👍', '🔥', '❤️', '🎉', '😡', '🤔', '🙌', '😘'];

export default function ChatUI() {
  const [messagesData, setMessagesData] = useState({
    1: [{ id: "m1", text: "Hello bhai, kaisa hai?", time: "05:30 PM", sender: "other", read: true }],
    2: [{ id: "m2", text: "Thanks!", time: "02:15 PM", sender: "other", read: true }],
    3: [{ id: "m3", text: "Kya chal raha hai?", time: "09:00 AM", sender: "other", read: true }],
    4: [{ id: "m4", text: "See you later", time: "Yesterday", sender: "other", read: true }]
  });

  const [unreadCounts, setUnreadCounts] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [activeUserId, setActiveUserId] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDropdownFor, setShowDropdownFor] = useState(null);

  const messagesEndRef = useRef(null);
  let typingTimeout = useRef(null);

  const activeUser = INITIAL_USERS.find((u) => u.id === activeUserId);
  const activeMessages = messagesData[activeUserId] || [];
  const isTyping = typingUsers[activeUserId];

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessagesData((prev) => ({
        ...prev,
        [data.roomId]: [...(prev[data.roomId] || []), { ...data, read: true }]
      }));

      if (data.roomId !== activeUserId) {
        setUnreadCounts(prev => ({ ...prev, [data.roomId]: prev[data.roomId] + 1 }));
      }
    });

    socket.on("typing", (data) => {
      setTypingUsers(prev => ({ ...prev, [data.roomId]: true }));
    });

    socket.on("stop_typing", (data) => {
      setTypingUsers(prev => ({ ...prev, [data.roomId]: false }));
    });

    // Receive message deletion request
    socket.on("delete_message", (data) => {
      setMessagesData((prev) => {
        const roomMessages = prev[data.roomId] || [];
        return {
          ...prev,
          [data.roomId]: roomMessages.map(msg =>
            msg.id === data.messageId ? { ...msg, text: "🚫 This message was deleted", isDeleted: true } : msg
          )
        };
      });
    });

    return () => {
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("delete_message");
    };
  }, [activeUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages, isTyping]);

  useEffect(() => {
    if (unreadCounts[activeUserId] > 0) {
      setUnreadCounts(prev => ({ ...prev, [activeUserId]: 0 }));
    }
  }, [activeUserId, unreadCounts]);

  const handleTyping = (e) => {
    setInput(e.target.value);
    socket.emit("typing", { roomId: activeUserId });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stop_typing", { roomId: activeUserId });
    }, 1500);
  };

  const addEmoji = (emoji) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const deleteMessage = (messageId) => {
    setMessagesData((prev) => {
      const roomMessages = prev[activeUserId] || [];
      return {
        ...prev,
        [activeUserId]: roomMessages.map(msg =>
          msg.id === messageId ? { ...msg, text: "🚫 You deleted this message", isDeleted: true } : msg
        )
      };
    });

    socket.emit("delete_message", { roomId: activeUserId, messageId });
    setShowDropdownFor(null);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsgId = "msg_" + Date.now() + Math.random().toString(36).substr(2, 5);

    const messageData = {
      id: newMsgId,
      text: input,
      time: currentTime,
      sender: "me",
      roomId: activeUserId,
      read: true,
      isDeleted: false
    };

    setMessagesData((prev) => ({
      ...prev,
      [activeUserId]: [...(prev[activeUserId] || []), messageData]
    }));

    socket.emit("send_message", { ...messageData, sender: "other" });
    socket.emit("stop_typing", { roomId: activeUserId });
    setInput("");
    setShowEmojiPicker(false);
  };

  const filteredUsers = INITIAL_USERS.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Utility to handle clicks outside message dropdown
  useEffect(() => {
    const handleClickOutside = () => setShowDropdownFor(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 focus:outline-none">
      {/* Sidebar - Users List */}
      <div className="w-[400px] min-w-[300px] bg-white border-r border-gray-200 hidden md:flex flex-col shadow-sm z-10">
        <div className="h-16 px-4 bg-[#f0f2f5] flex items-center justify-between border-b border-gray-200">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm border border-gray-300 cursor-pointer">
            <img src="https://i.pravatar.cc/150?img=68" alt="my-dp" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-5 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
          </div>
        </div>

        {/* Search Bar */}
        <div className="h-14 p-2 px-3 border-b border-gray-200 flex items-center">
          <div className="bg-[#f0f2f5] rounded-lg flex items-center p-1.5 px-4 w-full border border-gray-100 focus-within:bg-white focus-within:shadow-sm focus-within:border-gray-200 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px] text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search or start new chat"
              className="bg-transparent border-none outline-none ml-4 w-full text-sm text-gray-700 placeholder-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto relative bg-white remove-scrollbar">
          {filteredUsers.map((user) => {
            const userMessages = messagesData[user.id] || [];
            const lastMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
            const isTargetTyping = typingUsers[user.id];

            return (
              <div
                key={user.id}
                onClick={() => setActiveUserId(user.id)}
                className={`px-3 py-3 relative cursor-pointer flex items-center transition-colors group ${activeUserId === user.id ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                  }`}
              >
                <div className="w-[49px] h-[49px] rounded-full overflow-hidden shadow-sm flex-shrink-0 mr-3">
                  <img src={user.avatar} alt="user dp" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full border-b border-gray-100 group-last:border-none pb-2">
                  <div className="flex justify-between items-baseline mb-0.5 mt-1">
                    <h3 className="font-normal text-[#111b21] text-[17px] truncate pr-2">{user.name}</h3>
                    <span className={`text-[12px] whitespace-nowrap ${unreadCounts[user.id] > 0 ? 'text-[#00a884] font-medium' : 'text-[#667781]'}`}>
                      {lastMsg ? lastMsg.time : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-[14px] truncate pr-4 ${isTargetTyping ? "text-[#00a884] font-medium" : "text-[#667781]"} ${lastMsg?.isDeleted ? 'italic text-gray-400' : ''}`}>
                      {isTargetTyping ? "typing..." : lastMsg ? (
                        <span className="flex items-center gap-1">
                          {lastMsg.sender === "me" && !lastMsg.isDeleted && (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-[15px] w-[15px] flex-shrink-0 ${lastMsg.read ? 'text-[#53bdeb]' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="truncate">{lastMsg.text}</span>
                        </span>
                      ) : "Tap to chat"}
                    </p>
                    {unreadCounts[user.id] > 0 && (
                      <div className="bg-[#00a884] min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-white text-[11px] font-bold px-1.5 ml-2 shadow-sm">
                        {unreadCounts[user.id]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#efeae2]">
        <div className="absolute inset-0 z-0 opacity-[0.35] bg-[url('https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg')] bg-repeat bg-[length:400px_400px]"></div>

        {/* Header */}
        <div className="h-16 px-4 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-4 cursor-pointer">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
              <img src={activeUser.avatar} alt="dp" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h2 className="font-medium text-[16px] text-[#111b21] leading-tight">{activeUser.name}</h2>
              <p className={`text-[12.5px] ${isTyping ? "text-[#00a884] font-medium" : "text-[#667781]"}`}>
                {isTyping ? "typing..." : activeUser.isOnline ? "online" : "last seen today at 04:30 PM"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[#54656f]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" /></svg>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px] cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 z-10 px-[5%] lg:px-[9%]">
          {/* Date Label */}
          <div className="flex justify-center mb-5 mt-2">
            <span className="bg-[#ffffff] text-[#54656f] text-[12.5px] px-3 py-1.5 rounded-lg shadow-sm font-medium uppercase tracking-wide">
              Today
            </span>
          </div>

          <div className="flex justify-center mb-5">
            <div className="bg-[#ffeecd] text-[#54656f] text-[12.5px] py-1.5 px-4 rounded-lg shadow-sm text-center max-w-sm flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              <p>Messages are end-to-end encrypted. No one outside can read them.</p>
            </div>
          </div>

          {activeMessages.map((msg, i) => {
            const isFirstInGroup = i === 0 || activeMessages[i - 1].sender !== msg.sender;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 group/msg ${msg.sender === "me" ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-3" : "mt-0.5"}`}
              >
                {msg.sender === "other" && (
                  <div className="w-8 h-8 rounded-full overflow-hidden mt-0 flex-shrink-0 shadow-sm border border-white">
                    <img src={activeUser.avatar} alt="dp" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className={`flex flex-col ${msg.sender === "me" ? "items-end" : "items-start"} max-w-[65%] relative`}>

                  {/* Dropdown menu arrow for my messages */}
                  {msg.sender === "me" && !msg.isDeleted && (
                    <div
                      onClick={(e) => { e.stopPropagation(); setShowDropdownFor(msg.id === showDropdownFor ? null : msg.id); }}
                      className="absolute right-1 top-2 bg-gradient-to-l from-[#d9fdd3] to-transparent pl-4 pr-1 z-20 cursor-pointer text-gray-500 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Context Menu Box */}
                  {showDropdownFor === msg.id && (
                    <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-2 w-48 text-[15px] font-medium animate-fade-in-down">
                      <div onClick={() => { }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Reply</div>
                      <div onClick={() => deleteMessage(msg.id)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-red-500 hover:text-red-600">Delete message</div>
                    </div>
                  )}

                  <div
                    className={`px-2 pt-1.5 pb-2 shadow-sm relative text-[14.2px] inline-block ${msg.sender === "me"
                        ? `bg-[#d9fdd3] text-[#111b21] rounded-lg ${isFirstInGroup ? "rounded-tr-none" : ""}`
                        : `bg-white text-[#111b21] rounded-lg ${isFirstInGroup ? "rounded-tl-none" : ""}`
                      } ${msg.isDeleted ? 'italic text-gray-500 bg-opacity-70' : ''}`}
                    style={{ wordBreak: 'break-word', minWidth: '85px' }}
                  >
                    <p className="leading-snug pl-1 pr-16">{msg.text}</p>
                    <div className="absolute right-1.5 bottom-1 flex items-center gap-1" style={{ marginTop: "5px" }}>
                      <span className="text-[10px] text-[#667781] leading-none">
                        {msg.time}
                      </span>
                      {msg.sender === "me" && !msg.isDeleted && (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-[15px] w-[15px] -ml-0.5 ${msg.read ? 'text-[#53bdeb]' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className="flex justify-start gap-2 transition-all duration-300 mt-3 relative">
              <div className="w-8 h-8 rounded-full overflow-hidden mt-0 flex-shrink-0 shadow-sm border border-white">
                <img src={activeUser.avatar} alt="dp" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white px-3 py-2.5 rounded-lg rounded-tl-none shadow-sm flex items-center justify-center gap-1.5 w-[65px] h-[38px] mb-2">
                <span className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji Picker Box above input */}
        {showEmojiPicker && (
          <div className="absolute bottom-[66px] left-4 bg-white shadow-xl rounded-lg border border-gray-100 p-3 z-30 w-[300px] grid grid-cols-5 gap-2">
            {EMOJIS.map((emoji, index) => (
              <div
                key={index}
                onClick={() => addEmoji(emoji)}
                className="text-2xl text-center cursor-pointer hover:bg-gray-100 rounded-md p-1 transition-colors"
              >
                {emoji}
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3 z-20 w-full min-h-[62px]">
          <svg
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            xmlns="http://www.w3.org/2000/svg"
            className={`h-[26px] w-[26px] cursor-pointer transition-colors ${showEmojiPicker ? 'text-[#00a884]' : 'text-[#54656f] hover:text-[#3b474e]'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-[26px] w-[26px] text-[#54656f] cursor-pointer hover:text-[#3b474e] transition-colors hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>

          <form
            onSubmit={sendMessage}
            className="flex-1 flex items-center bg-white rounded-lg px-4 py-2 border border-transparent focus-within:border-gray-200"
          >
            <input
              value={input}
              onChange={handleTyping}
              onFocus={() => setShowEmojiPicker(false)}
              className="w-full text-[15px] border-none outline-none text-[#111b21] placeholder-[#8696a0]"
              placeholder="Type a message"
              autoFocus
            />
          </form>

          {input.trim() ? (
            <button onClick={sendMessage} className="p-2 ml-1 text-[#54656f] hover:text-[#3b474e] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[26px] w-[26px]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          ) : (
            <button className="p-2 ml-1 text-[#54656f] hover:text-[#3b474e] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[26px] w-[26px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
