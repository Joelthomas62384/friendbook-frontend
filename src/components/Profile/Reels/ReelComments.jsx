import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getCookie, timeAgo } from '@/utils';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EllipsisVertical } from 'lucide-react';
import { EllipsisVerticalIcon } from 'lucide-react';
import { Trash2Icon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReportModal from '@/components/common/ReportModal';
import { useDispatch } from 'react-redux';
import { showToast } from '@/redux/Slices/ToastSlice';




const ReelComments = ({ reelId, onClose , replyStatus , selectedComment }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyParent, setReplyParent] = useState(null);
  const [visibleReplies, setVisibleReplies] = useState({});
  const { user } = useSelector((state) => state.users)
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [replyPages, setReplyPages] = useState({});
  const [hasMoreReplies, setHasMoreReplies] = useState({});
  const [commentUrl, setCommentUrl] = useState(`${import.meta.env.VITE_API_URL}/api/profile/reels/comments/${reelId}?page=1`)
  const [reportReason, setReportReason] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportId, setReportId] = useState(null)
  const access = getCookie('accessToken');
  const dispatch = useDispatch()
  const [blink, setBlink] = useState(false);


  const handleReportValueChange = (e) => {
    console.log(reportId)
    console.log(reportReason)
    setReportReason(e.target.value)
  }


  useEffect(() => {
    if(selectedComment){
      setBlink(true)
      setTimeout(() => {
        setBlink(false)
      }, 1000);
    }
  }, [selectedComment])
  

  const submitReport = async()=>{

    if (!reportReason.trim()) return;
    const response  = await fetch(`${import.meta.env.VITE_API_URL}/api/report/`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        content_type:"reelcomment",
        object_id : reportId,
        reason: reportReason
      }),
    })
    const res = await response.json()
    console.log(res)
    if(response.status==201) {
      dispatch(showToast({
        message: 'Report submitted successfully',
        type:'s',
      }))
      console.log("status is workintg")
      
    }else{
      dispatch(showToast({
        message: 'Failed to submit report',
        type:'e',
      }))
      setReportReason("")
    }
    handleReportModal()
    setReportReason("")

  }
  const handleReportModal = (id) => {
    setReportModalOpen((prev) => !prev);
    if (reportModalOpen) {
      setReportId(null);
    } else {
      setReportId(id);
    }
  };
  const navigate = useNavigate()


  const fetchComments = async () => {
    let url = `${commentUrl}`
    console.log(replyStatus)
    if (selectedComment) {
      url += `&selected_comment=${selectedComment}`;
    }
    if (replyStatus) {
      url += `&reply_status=${replyStatus}`;
    }
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      const data = await response.json();
      console.log(data);
      

      if (response.ok) {
        if (commentUrl.endsWith('1')) {
          setComments(data.results);
          setHasMoreComments(data.results.length < data.count);
        } else {
          setComments((prev) => [...prev, ...data.results]);
          setHasMoreComments(prev => (prev.length + data.results.length) < data.count);
        }

        if (data.next) {
          setCommentUrl(data.next);
        }
      } else {
        console.log('Error fetching comments');
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleDeleteComment = async (commentId, replyOfComment = false, parentComment = null) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/reels/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      if (response.ok) {
        if (replyOfComment) {
          setComments((prevComments) =>
            prevComments.map((comment) =>
              comment.id === parentComment
                ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) }
                : comment
            )
          );
        } else {

          setComments(comments.filter((comment) => comment.id !== commentId));
        }
      } else {
        console.log('Error deleting comment');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }


  const fetchReplies = async (commentId, pageNumber = 1) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/reels/comments/reply/${commentId}?page=${pageNumber}`, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === commentId
              ? { ...comment, replies: [...(comment.replies || []), ...data.results] }
              : comment
          )
        );
        setHasMoreReplies((prev) => ({ ...prev, [commentId]: !!data.next }));
      } else {
        console.log('Error fetching replies');
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error);
    }
  };

  useEffect(() => {
    if (comments.length === 0) {

      fetchComments();
    }
  }, [reelId]);

  const handleReply = (comment, isReplyToReply = false) => {
    setReplyTo(comment);
    if (isReplyToReply) {
      setReplyParent(comment);
    } else {
      setReplyParent(null);
    }
    setNewComment(`@${comment.user} `);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setReplyParent(null);
    setNewComment('');
  };






  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    if (replyTo) {
      if (replyParent) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/reels/comments/reply-to-reply/${replyParent?.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ content: newComment }),
        });
        const res = await response.json();

        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === replyParent?.parent
              ? {
                ...comment,
                replies: [res, ...(comment.replies || [])],
              }
              : comment
          )
        );
      } else {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/reels/comments/reply/${replyTo?.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ content: newComment }),
        });
        const res = await response.json();
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === replyTo?.id
              ? {
                ...comment,
                has_replies: true,
                replies: [res, ...(comment.replies || [])],
              }
              : comment
          )
        );
      }
    } else {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profile/reels/comments/${reelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ content: newComment }),
      });
      const res = await response.json();
      setComments((prevComments) => [res, ...prevComments]);
    }

    setNewComment('');
    setReplyTo(null);
    setReplyParent(null);
  };

  const toggleReplies = (commentId) => {

    const comment = comments.filter(comment => comment.id === commentId)[0]

    setVisibleReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));

    if (!visibleReplies[commentId] && comment?.replies.length === 0) {
      fetchReplies(commentId);
    }
  };

useEffect(() => {
  if (replyStatus && comments.length > 0) {
    const firstComment = comments[0];

    // Automatically toggle the replies of the first comment if not visible
    if (!visibleReplies[firstComment.id]) {
      toggleReplies(firstComment.id);
    }

    // Fetch more replies if necessary for the first comment
    if (!firstComment.replies || firstComment.replies.length === 0) {
      fetchReplies(firstComment.id);
    }
  }
}, [replyStatus, comments]);

  function highlightMentions(content) {
    const mentionPattern = /(@\w+)/g;
    const parts = content.split(mentionPattern);

    return parts.map((part, index) => {
      if (mentionPattern.test(part)) {
        return (
          <span
            key={index}
            onClick={() => {
              const username = part.slice(1);
              navigate(`/profile/${username}`);
              onClose();
            }}
            className="text-blue-500 hover:cursor-pointer hover:text-blue-600"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }

  const loadMoreComments = () => {

    fetchComments();
  };

  const loadMoreReplies = (commentId) => {
    const nextPage = (replyPages[commentId] || 1) + 1;
    setReplyPages((prev) => ({ ...prev, [commentId]: nextPage }));
    fetchReplies(commentId, nextPage);
  };

  return (
    <div className="w-1/2 flex flex-col h-full">
      <ScrollArea className="flex-1 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500">No comments available.</p>
        ) : (
          comments.map((comment, index) => (
            <div
            key={`comment_${index}`}
            className={`mb-4 border-b pb-2 ${
              index === 0 && selectedComment && blink && !replyStatus? 'bg-muted/60 animate-pulse' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <Avatar className="mt-3 w-8 h-8 object-cover cursor-pointer" onClick={() => { navigate(`/profile/${comment.user}`); onClose() }} size="sm">
                <AvatarImage
                  src={comment.profile_pic || 'https://via.placeholder.com/150'}
                  alt={comment.user || 'User Avatar'}
                />
                <AvatarFallback>{comment.user ? comment.user[0] : "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 py-3">
                <div className="flex gap-3">
                  <p
                    onClick={() => {
                      navigate(`/profile/${comment.user}`);
                      onClose();
                    }}
                    className="font-bold cursor-pointer"
                  >
                    {comment.user ? comment.user : 'Unknown User'}:
                  </p>
          
                  <p
                    className={`text-sm mt-1 ${index === 0 && selectedComment && blink && !replyStatus? 'bg-muted/60 animate-pulse' : ''}`}
                  >
                    {comment.content}
                  </p>
                </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{timeAgo(comment.created_at)}</span>

                    {comment.has_replies ? (
                      <p
                        className="text-blue-500 text-xs cursor-pointer select-none"
                        onClick={() => toggleReplies(comment.id)}
                      >
                        {visibleReplies[comment.id] ? 'Hide replies' : 'Show replies'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">No replies</p>
                    )}
                    <p
                      onClick={() => handleReply(comment)}
                      className="text-blue-500 text-xs cursor-pointer"
                    >
                      Reply
                    </p>

                    <DropdownMenu className='text-xs' >
                      <DropdownMenuTrigger asChild >
                        <EllipsisVerticalIcon className='h-3 cursor-pointer mt-1' />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-muted hover:bg-muted/90 active:bg-muted/90 ">


                        {user.username === comment.user ? (<DropdownMenuItem onClick={() => { handleDeleteComment(comment.id, false) }} className="text-red-500 text-xs cursor-pointer hover:text-red-600 hover:bg-muted" >
                          <Trash2Icon className='h-3 ' />
                          Delete</DropdownMenuItem>) : (
                          <DropdownMenuItem className="text-red-500 text-xs cursor-pointer hover:text-red-600 hover:bg-muted" onClick={() => { handleReportModal(comment?.id);  }}  >
                            <TriangleAlert className='h-3 ' />
                            Report</DropdownMenuItem>
                        )
                        }

                      </DropdownMenuContent>
                    </DropdownMenu>

                  </div>


                  {visibleReplies[comment.id] && comment.replies && (
                    <div className=" mt-3">
                      {comment.replies.map((reply, index) => (
                        <div key={`reply_${index}_${reply.id}`} className={`mb-4 border-b pb-2 ${
                          reply.id === selectedComment && blink && replyStatus? 'bg-muted/60 animate-pulse' : ''
                        }`}>
                          <div className="flex items-start gap-2 mt-4">
                            <Avatar className=" cursor-pointer" onClick={() => { navigate(`/profile/${reply.user}`); onClose() }} size="xs">
                              <AvatarImage
                                className="object-cover h-9 w-9 rounded-full"
                                size="sm"
                                src={reply.profile_pic || 'https://via.placeholder.com/150'}
                                alt={reply.user || 'User Avatar'}
                              />
                              <AvatarFallback>{reply.user ? reply.user[0] : "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex gap-2">
                                <p className="font-bold text-xs cursor-pointer" onClick={() => { navigate(`/profile/${reply.user}`); onClose() }} >{reply.user}:</p>

                                <p className="text-xs">
                                  {highlightMentions(reply.content)}
                                </p>

                              </div>
                              <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-500">{timeAgo(reply.created_at)}</span>
                                <p
                                  onClick={() => handleReply(reply, true)}
                                  className="text-blue-500 text-xs cursor-pointer"
                                >
                                  Reply
                                </p>

                                <DropdownMenu className='text-xs' >
                                  <DropdownMenuTrigger asChild >
                                    <EllipsisVerticalIcon className='h-3 cursor-pointer mt-1' />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-muted hover:bg-muted/90 active:bg-muted/90 ">


                                    {user.username === reply.user ? (<DropdownMenuItem onClick={() => { handleDeleteComment(reply.id, true, reply.parent) }} className="text-red-500 text-xs cursor-pointer hover:text-red-600 hover:bg-muted" >
                                      <Trash2Icon className='h-3 ' />
                                      Delete</DropdownMenuItem>) : (
                                      <DropdownMenuItem onClick={() => { handleReportModal(reply?.id);  }} className="text-red-500 text-xs cursor-pointer hover:text-red-600 hover:bg-muted" >
                                        <TriangleAlert className='h-3 '  />
                                        Report</DropdownMenuItem>
                                    )
                                    }

                                  </DropdownMenuContent>
                                </DropdownMenu>



                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {hasMoreReplies[comment.id] && (
                        <p

                          className="text-xs text-blue-500 cursor-pointer"
                          onClick={() => loadMoreReplies(comment.id)}
                        >
                          Load more replies
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {hasMoreComments && (
          <p className="w-full text-sm text-blue-500 cursor-pointer" onClick={loadMoreComments}>
            Load more comments
          </p>
        )}
      </ScrollArea>

      <div className="border-t border-gray-200 p-4 flex items-center gap-3">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyTo ? `Replying to @${replyTo.user}` : 'Add a comment...'}
          className="flex-1"
        />
        {replyTo && (
          <p className='text-blue-500 cursor-pointer' onClick={cancelReply}>
            Cancel
          </p>
        )}
        <Button onClick={handleAddComment}>Post</Button>
      </div>
      <ReportModal onClose={handleReportModal} open={reportModalOpen} handleReportValueChange={handleReportValueChange} submitReport={submitReport} reportReason={reportReason}/>
    </div>
  );
};

export default ReelComments;

