
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import React from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios } = useContext(AuthContext);

    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const sendMessage = async (messageData) => {
        if (!selectedUser) return;
        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
            if (data.success) {
                setMessages((prevMessages) => [...prevMessages, data.newMessage]);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };
    
    const subscribeToMessages = async ()=>{
        if(!socket){
            return;
        }
        socket.on("newMessage",(newMessage)=>{
            if (selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                axios.put(`/api/messages/mark/${newMessage._id}`);
            } else {
                // If the chat with the sender is not open, update the unseen count.
                toast.success(`New message from another user`);
                setUnseenMessages((prev) => ({
                    ...prev,
                    [newMessage.senderId]: prev[newMessage.senderId] ? prev[newMessage.senderId]+1 : 1,
                }));
            }
        })
    }

    const unsubscribeFromMessages = ()=>{
        if(socket) socket.off("newMessage")
    }

    useEffect(() => {
        subscribeToMessages()
        return  ()=> unsubscribeFromMessages()
    }, [socket, selectedUser]); // Dependency array now includes selectedUser.

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
    };

    return (
        <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
    );
};
