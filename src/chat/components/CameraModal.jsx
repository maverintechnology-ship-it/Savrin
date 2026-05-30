import { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCcw, Square, Circle } from 'lucide-react';

export default function CameraModal({ mode, onClose, onCapture }) {
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: mode === 'video' 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsReady(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera");
      onClose();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      blob.name = `photo_${Date.now()}.jpg`;
      onCapture(blob);
    }, 'image/jpeg');
  };

  const startRecording = () => {
    chunksRef.current = [];
    const stream = videoRef.current.srcObject;
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      blob.name = `video_${Date.now()}.webm`;
      onCapture(blob);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
        <div className="absolute top-6 right-6 z-10">
          <button onClick={onClose} className="p-2 bg-black/50 text-white rounded-full hover:bg-black transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={!isRecording}
          className="w-full aspect-video object-cover bg-black"
        />

        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-6">
          <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-widest">
            {mode === 'photo' ? 'Photo Mode' : (isRecording ? 'Recording...' : 'Video Mode')}
          </div>

          <div className="flex items-center gap-8">
            <button onClick={startCamera} className="p-4 text-white/50 hover:text-white transition-all">
              <RefreshCcw className="w-6 h-6" />
            </button>

            {mode === 'photo' ? (
              <button 
                onClick={takePhoto}
                className="w-20 h-20 bg-white rounded-full border-4 border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
              >
                <div className="w-16 h-16 bg-white rounded-full border-2 border-zinc-200"></div>
              </button>
            ) : (
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl ${isRecording ? 'bg-red-500' : 'bg-white'}`}
              >
                {isRecording ? <Square className="w-8 h-8 text-white fill-white" /> : <Circle className="w-10 h-10 text-red-500 fill-red-500" />}
              </button>
            )}

            <div className="w-14" /> {/* Spacer */}
          </div>
        </div>
      </div>
    </div>
  );
}
