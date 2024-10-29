import React, { useEffect, useState, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Menu, X, Phone, Video, SendHorizonal, Check, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useParams } from "react-router-dom";
import { formatTimestamp, getCookie } from "@/utils";
import { useSelector } from "react-redux";
import { Mic } from "lucide-react";
import { Link } from "react-router-dom";
import UploadModal from "./UploadModal";

const ChatArea = ({ open, handleOpen }) => {
  const [isChatRoom, setIsChatRoom] = useState(false);
  const [chatRoom, setChatRoom] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const seenWs = useRef(null)
  const callWs = useSelector((state) => state.call.ws);


  const { user } = useSelector((state) => state.users);
  const { roomName } = useParams();
  const access = getCookie("accessToken");

  const fetchMessages = async () => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/chat/get-messages/${roomName}`,
      {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      }
    );
    const data = await response.json();
    if (response.ok) {
      setMessages(data);
      console.log(data)
    }
  };

  const fetchChatList = async () => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/chat/chat-room/specific/${roomName}`,
      {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      }
    );
    const data = await response.json();
    if (response.ok) {
      setChatRoom(data);
    }
  };

  useEffect(() => {
    if (roomName) {
      setIsChatRoom(true);
      fetchChatList();
      fetchMessages();

      if (!ws.current) {
        ws.current = new WebSocket(
          `${import.meta.env.VITE_WS_URL}/ws/chat/${roomName}/?token=${access}`
        );

        ws.current.onopen = () => {
          console.log("WebSocket for chat connected!");
        };

        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setMessages((prevMessages) => [...prevMessages, data]);
        };

        ws.current.onclose = () => {
          console.log("WebSocket for chat disconnected");
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket error: ", error);
        };
      }

      return () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.close();
          ws.current = null; 
        }
      };
    } else {
      setIsChatRoom(false);
    }
  }, [roomName]);


  useEffect(() => {
    if(roomName){
      if(!seenWs.current){
        seenWs.current = new WebSocket(
          `${import.meta.env.VITE_WS_URL}/ws/chat/seen/${roomName}/?token=${access}`
        )

        seenWs.current.onopen = (event) => {
          
          console.log("WebSocket for seen connected!")
        }


        seenWs.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const seenIds = data.seen_message_ids;
      
          setMessages((prevMessages) =>
            prevMessages.map((message) =>
              seenIds.includes(message.id)
                ? { ...message, seen: true }
                : message
            )
          );
        };

        seenWs.current.onclose = () => {
          console.log("WebSocket for seen disconnected")
        }

        seenWs.current.onerror = (error) => {
          console.error("WebSocket error: ", error)
        }


      }
    }

    return () => {
      if (seenWs.current && seenWs.current.readyState === WebSocket.OPEN) {
        seenWs.current.close();
        seenWs.current = null; 
      }
    };
  }, [roomName])
  

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
 
  }, [messages]);

  const sendMessage = () => {
    if (newMessage.trim() !== "" && ws.current) {
      const messageData = {
        content_type: "textmessage",
        content: {
          text: newMessage,
        },
      };

      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(messageData));
        setNewMessage("");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const get_letter = (full_name) => {
    const lis = full_name.split(" ");
    if (lis.length > 1) {
      return lis[0][0].toUpperCase() + lis[1][0].toUpperCase();
    }
    return full_name[0];
  };


  const VideoCall = (target_username)=>{
    if(callWs.readyState === WebSocket.OPEN){
      callWs.send(JSON.stringify({ action:"call_request",target_username  }));
    }
  }

  return (
    <>
      {isChatRoom ? (
        <div className="w-full flex flex-col bg-background h-[45rem] border">
          <div className="flex items-center justify-between p-4 bg-muted ">
            <div className="flex items-center space-x-4">
              {!open ? (
                <Menu className="cursor-pointer" onClick={handleOpen} />
              ) : (
                <X className="cursor-pointer" onClick={handleOpen} />
              )}
              <Avatar>
                <AvatarImage
                  src={chatRoom?.other_user?.profile_picture}
                  className="object-cover "
                />
                <AvatarFallback className="bg-muted-foreground/40">
                  {get_letter(chatRoom?.other_user?.full_name || "")}
                </AvatarFallback>
              </Avatar>

              <div>
                <h4 className="font-semibold text-muted-foreground">
                  {chatRoom?.other_user?.full_name}
                </h4>
                <p className="text-sm text-muted-foreground/60">
                  @{chatRoom?.other_user?.username}
                </p>
              </div>
            </div>
            <div className="flex space-x-4">
              <Button className="text-muted-foreground bg-background/30">
                <Phone />
              </Button>
              <Button onClick={()=>{VideoCall(chatRoom?.other_user?.username)}} className="text-muted-foreground bg-background/30">
                <Video />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {messages &&
              messages.map((message, index) => (
                <div key={index}>
                  {message.sender !== user.username ? (
                    <div className="flex space-x-4 items-center">
                      <Link to={`/profile/${message.sender}`}>
                      <Avatar>
                        <AvatarImage className="object-cover" src={message?.profile_picture} />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      </Link>

                      <div>
                        <div
                          className={`p-4 rounded-lg shadow mt-4 ${
                            message.seen ? "bg-muted/60" : "bg-muted/30"
                          }`}
                        >
                          {message.content_type === "textmessage" && (
                            <p className="text-muted-foreground">
                              {message?.content_object?.text}
                            </p>
                          )}
                          {message.content_type === "imagemessage" && (
                            <img
                              src={message?.content_object?.image}
                              alt="Image"
                              className="max-w-xs"
                            />
                          )}
                          {message.content_type === "videomessage" && (
                            <video
                              controls
                              src={message?.content_object?.video}
                              className="max-w-xs"
                            />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground/60">
                         {formatTimestamp(message?.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                   <>
                    <div className="flex justify-end space-x-4 items-center">
                    <div className="flex flex-col space-y-2 items-end">
                    <div
                        className={`p-4 rounded-lg shadow relative ${
                          message.seen ? "bg-blue-500/60" : "bg-blue-700"
                        }`}
                      >
                        {message.content_type === "textmessage" && (
                          <p className="text-muted-foreground">
                            {message?.content_object?.text}
                          </p>
                        )}
                        {message.content_type === "imagemessage" && (
                          <img
                            src={message?.content_object?.image}
                            alt="Image"
                            className="max-w-xs"
                          />
                        )}
                        {message.content_type === "videomessage" && (
                          <video
                            controls
                            src={message?.content_object?.video}
                            className="max-w-xs"
                          />
                        )}
                        {message.seen && (
                          <Check className="absolute bottom-2 right-2 text-muted-foreground" size={16} />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground/60">
                         {formatTimestamp(message?.timestamp)}
                        </span>
                    </div>
                      <Avatar>
                        <AvatarImage className="object-cover" src={message?.profile_picture} />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                    
                    </div>

                    
                   </>
                    
                  )}
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex p-4 bg-muted items-center">
            <Input
              className="w-full p-2 bg-background/30 text-muted-foreground rounded"
              placeholder="Write your message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <label className="mx-2 cursor-pointer">
              <Mic />
            </label>
            <label className="mx-2 cursor-pointer">
            <UploadModal roomName={roomName} ws={ws} />
            </label>

            <Button
              className="ml-2 bg-muted/30 text-muted-foreground"
              onClick={sendMessage}
            >
              <SendHorizonal />
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col bg-background h-[45rem] border ">
          {!open ? (
            <Menu className="cursor-pointer mt-6 mx-4" onClick={handleOpen} />
          ) : (
            <X className="cursor-pointer mt-6 mx-4" onClick={handleOpen} />
          )}
          <div className="flex items-center justify-center h-full p-4  ">
            <div className="flex items-center space-x-4">
              <h2 className="font-semibold text-muted-foreground/50">
                Chat with your friends
              </h2>
            </div>
          </div>
        </div>
      )}


    </>
  );
};

export default ChatArea;
