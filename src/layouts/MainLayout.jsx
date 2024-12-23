import { RouteChangeHandler } from '@/App'
import Authenticate from '@/authenticate'
import CallModal from '@/components/Call/CallModal'
import CallRequestToast from '@/components/Call/CallRequestToast'
import StartCalling from '@/components/Call/StartCalling'
import NavigationMenu from '@/components/common/NavigationMenu'
import Sidebar from '@/components/common/Sidebar'
import Toast from '@/components/common/Toast'
import UploadModal from '@/components/common/UploadModal'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { receiveCallRequest, setWebSocket, closeWebSocket, declineCall, acceptCall } from '@/redux/Slices/CallSlice'
import { setModalOpen } from '@/redux/Slices/PostSlice'
import { getCookie } from '@/utils'
import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'

const MainLayout = () => {
    const { NotificationModalOpen } = useSelector(state => state.notification);
    const postModalOpen = useSelector((state) => state.post.postModalOpen)
    const dispatch = useDispatch()
    const ws = useRef(null)
    const access = getCookie('accessToken')
    const { user } = useSelector((state) => state.users)
    const call = useSelector((state) => state.call)
    const audioRef = useRef(new Audio('/callsound.wav'))
    const notificationWs = useRef(null)
    const {toast } = useToast()
    const handleAudioPlay = () => {
        audioRef.current.loop = true
        audioRef.current.play().catch((error) => {
            console.log('Audio playback failed:', error)
        })
    }

    const handleAudioStop = () => {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
    }

    useEffect(() => {
        if(!user?.username) return 
        ws.current = new WebSocket(
            `${import.meta.env.VITE_WS_URL}/ws/call/notification/${user?.username}/?token=${access}`
        )

        ws.current.onopen = () => {
            console.log("WebSocket connected! to notification")
        }

        ws.current.onclose = (e) => {
            console.log(e)
            console.log("notification disconnected")
        }

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
        
            if (data.type === 'CALL_REQUEST' && data.from !== user?.username) {
                if(call.isInCall){
                    ws.send(JSON.stringify({action:"reject",target_username:call.incomingCall.from}))
                    dispatch(declineCall())
                
                }else{

                
                    dispatch(receiveCallRequest({ from: data.from, callerImage: data.profile_picture }))
                    handleAudioPlay()
                }
            }

            if(data.type === "CALL_REJECTED" ){
                console.log("rejected")
                dispatch(declineCall())
            }
            if (data.type === "CALL_ABANDONED"){
                dispatch(declineCall())
            }
            if (data.type === "CALL_ACCEPTED"){
                
            
                dispatch(acceptCall())
            }
        }

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error)
        }

        dispatch(setWebSocket(ws.current))

        ws.onerror = (e)=>{
            console.log(e)
        }
        return () => {
           
            dispatch(closeWebSocket())  
        }
    }, [access, user?.username, dispatch])


    useEffect(() => {
        if(!user?.username) return 
        notificationWs.current = new WebSocket(
            `${import.meta.env.VITE_WS_URL}/ws/notification/${user?.username}/?token=${access}`
        )
        notificationWs.current.onopen = (e)=>{
            console.log("normal Notification connected!")
        }
        notificationWs.current.onerror = (e)=>{
            console.log(e)
        }

        notificationWs.current.onmessage = (e)=>{
            const data = JSON.parse(e.data)
        
            const content_type = data?.content_type
            
            const title = content_type === "post" || content_type==="reels" ? "Post" : content_type === 'like' || content_type==="reellike" ? "Like" : content_type==='comment' || content_type==='reelcomment' ? "Comment" : data?.content_object?.accepted ? "New Follower" : "Follow Request"
        
            toast({id: data?.content_id , title :title  , description : data?.content , image:data?.content_object?.profile_picture , username : data?.content_object?.username })
        }
    }, [access , user?.username , dispatch])
    

    useEffect(() => {
        if (!call.incomingCall) {
            handleAudioStop()
        }
    }, [call.incomingCall])

    return (
        <>
            <RouteChangeHandler />
            <Authenticate>
              
                <Toast />
                {call.incomingCall && <CallRequestToast />}
                {call.isCalling && <StartCalling/>}
                {call.isInCall && <CallModal/>}
                <div className="flex ">
                   
                        <Sidebar />
                  
                    {postModalOpen && <UploadModal isOpen={postModalOpen} onClose={() => { dispatch(setModalOpen()) }} />}
                    <Outlet />
                </div>
                <NavigationMenu />
                <Toaster />
            </Authenticate>
        </>
    )
}

export default MainLayout
