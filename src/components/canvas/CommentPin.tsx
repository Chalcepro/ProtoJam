import React, { useState } from 'react';
import { CanvasComment } from '../../types/components';
import { useProjectStore } from '../../store/useProjectStore';
import * as Icons from 'lucide-react';

interface CommentPinProps {
  comment: CanvasComment;
}

export const CommentPin: React.FC<CommentPinProps> = ({ comment }) => {
  const { activeCommentId, setActiveCommentId, addCommentReply, toggleCommentResolved, deleteComment } = useProjectStore();
  const [replyText, setReplyText] = useState('');
  const isOpen = activeCommentId === comment.id;

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    addCommentReply(comment.id, text);
    setReplyText('');
  };

  return (
    <div style={{ position: 'absolute', left: comment.x, top: comment.y }} className="z-40">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setActiveCommentId(isOpen ? null : comment.id);
        }}
        className={`w-7 h-7 rounded-full border-2 border-[rgb(20,20,19)] shadow-lg -translate-x-1/2 flex items-center justify-center text-[11px] font-bold transition-transform hover:scale-110 ${
          comment.resolved ? 'bg-[rgba(235,235,236,0.3)] text-[rgb(20,20,19)]' : 'bg-[#ff6b4a] text-[rgb(20,20,19)]'
        }`}
        title={comment.resolved ? 'Resolved' : comment.text}
      >
        {comment.resolved ? <Icons.Check size={13} /> : <Icons.MessageCircle size={13} />}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="mt-1 w-64 bg-[rgb(20,20,19)] border border-[rgba(235,235,236,0.18)] rounded-xl shadow-2xl overflow-hidden text-xs"
        >
          <div className="max-h-52 overflow-y-auto p-2.5 space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold text-[rgb(235,235,236)]">{comment.author}</span>
                <span className="text-[10px] text-[rgba(235,235,236,0.35)]">
                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[rgba(235,235,236,0.8)] whitespace-pre-wrap">{comment.text}</p>
            </div>

            {comment.replies.map(r => (
              <div key={r.id} className="pl-2 border-l border-[rgba(235,235,236,0.1)]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-[rgb(235,235,236)]">{r.author}</span>
                  <span className="text-[10px] text-[rgba(235,235,236,0.35)]">
                    {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[rgba(235,235,236,0.8)] whitespace-pre-wrap">{r.text}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-[rgba(235,235,236,0.08)] p-2 flex items-center gap-1.5">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              placeholder="Reply..."
              className="flex-1 bg-[rgba(235,235,236,0.06)] text-[rgb(235,235,236)] px-2 py-1.5 rounded-lg outline-none border border-[rgba(235,235,236,0.1)] text-xs min-w-0"
            />
            <button
              onClick={submitReply}
              className="p-1.5 rounded-lg bg-[rgba(235,235,236,0.08)] hover:bg-[rgba(235,235,236,0.15)] text-[rgb(235,235,236)] shrink-0"
              title="Send reply"
            >
              <Icons.Send size={12} />
            </button>
          </div>

          <div className="border-t border-[rgba(235,235,236,0.08)] p-1.5 flex items-center justify-between">
            <button
              onClick={() => toggleCommentResolved(comment.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-[rgba(235,235,236,0.7)] hover:bg-[rgba(235,235,236,0.08)] hover:text-[rgb(235,235,236)]"
            >
              <Icons.Check size={11} />
              {comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
            <button
              onClick={() => deleteComment(comment.id)}
              className="p-1.5 rounded-lg text-[rgba(235,235,236,0.5)] hover:text-rose-400 hover:bg-[rgba(235,235,236,0.08)]"
              title="Delete thread"
            >
              <Icons.Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
