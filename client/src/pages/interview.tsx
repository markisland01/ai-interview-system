import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InterviewSession, Question } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import Vapi from "@vapi-ai/web";
import { cleanQuestionText } from "@/lib/utils";
import { CircularWaveform } from "@/components/circular-waveform";

export default function Interview() {
  const [, params] = useRoute("/interview/:sessionUrl");
  const sessionUrl = params?.sessionUrl;
  
  const [setupStep, setSetupStep] = useState<"welcome" | "confirm" | "ready" | "completed">("welcome");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioTestCompleted, setAudioTestCompleted] = useState(false);
  const [showAudioConfirm, setShowAudioConfirm] = useState(false);
  const [micTestCompleted, setMicTestCompleted] = useState(false);
  const [cameraTestCompleted, setCameraTestCompleted] = useState(false);
  const [isCameraTestOn, setIsCameraTestOn] = useState(false);
  const cameraTestVideoRef = useRef<HTMLVideoElement>(null);
  const cameraTestStreamRef = useRef<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStarted, setQuestionStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const registeredCallIdRef = useRef<string | null>(null);
  const currentQuestionIndexRef = useRef<number>(0);
  const allQuestionsRef = useRef<any[]>([]);
  const startIndexRef = useRef<number>(0);
  const totalQuestionsRef = useRef<number>(0);

  const { data: session, isLoading } = useQuery<InterviewSession>({
    queryKey: [`/api/interview/${sessionUrl}`],
    enabled: !!sessionUrl,
  });

  const { data: questions } = useQuery<Question[]>({
    queryKey: [`/api/questions/${session?.interviewerId}`],
    enabled: !!session?.interviewerId,
  });

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Cleanup camera test stream on unmount
      if (cameraTestStreamRef.current) {
        cameraTestStreamRef.current.getTracks().forEach(track => track.stop());
        cameraTestStreamRef.current = null;
      }
      // Cleanup mic stream on unmount
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      // Clear analyser ref
      analyserRef.current = null;
    };
  }, []);

  // Auto-start camera when entering ready (interview) screen
  useEffect(() => {
    if (setupStep === "ready" && !isCameraOn) {
      startCamera();
    }
  }, [setupStep]);

  // Auto-start interview when entering ready (interview) screen
  useEffect(() => {
    if (setupStep === "ready" && !isStarting && !isCallActive) {
      startInterview();
    }
  }, [setupStep]);

  // Set camera test stream when video element is ready
  useEffect(() => {
    if (isCameraTestOn && cameraTestVideoRef.current && cameraTestStreamRef.current) {
      cameraTestVideoRef.current.srcObject = cameraTestStreamRef.current;
    }
  }, [isCameraTestOn]);

  // Detect user speaking based on mic level
  useEffect(() => {
    const SPEECH_THRESHOLD = 15; // Threshold for detecting speech
    setIsUserSpeaking(micLevel > SPEECH_THRESHOLD);
  }, [micLevel]);

  // Enumerate audio devices on mount
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const inputs = devices.filter(d => d.kind === "audioinput");
        const outputs = devices.filter(d => d.kind === "audiooutput");
        
        setAudioInputDevices(inputs);
        setAudioOutputDevices(outputs);
        
        // Set default devices if not already selected
        if (!selectedAudioInput && inputs.length > 0) {
          setSelectedAudioInput(inputs[0].deviceId);
        }
        if (!selectedAudioOutput && outputs.length > 0) {
          setSelectedAudioOutput(outputs[0].deviceId);
        }
      } catch (error) {
        console.error("Failed to enumerate devices:", error);
      }
    };
    
    enumerateDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
    };
  }, []);

  const startMicrophone = async () => {
    try {
      const audioConstraints = selectedAudioInput 
        ? { deviceId: { exact: selectedAudioInput } }
        : {};
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints, 
        video: false 
      });
      
      micStreamRef.current = stream;
      setIsMicOn(true);

      // Set up Web Audio API for volume visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring mic level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        // Use refs instead of state to avoid closure issues
        if (analyserRef.current && micStreamRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setMicLevel(Math.min(100, (average / 255) * 100 * 2));
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
      
    } catch (error) {
      console.error("マイクの起動に失敗しました:", error);
      alert("マイクの起動に失敗しました。ブラウザの設定でマイクの使用を許可してください。");
    }
  };

  const stopMicrophone = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsMicOn(false);
    setMicLevel(0);
  };

  const startRecording = async () => {
    if (!micStreamRef.current) return;

    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(micStreamRef.current);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setRecordedAudio(audioUrl);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playTestAudio = async () => {
    // Create a simple beep sound using Web Audio API
    const audioContext = new AudioContext();
    
    // Try to set output device if supported (Chrome 110+)
    if (selectedAudioOutput && 'setSinkId' in audioContext) {
      try {
        await (audioContext as any).setSinkId(selectedAudioOutput);
      } catch (error) {
        console.warn("Failed to set audio output device:", error);
      }
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    setShowAudioConfirm(true);
  };

  const confirmAudioHeard = () => {
    setAudioTestCompleted(true);
    setShowAudioConfirm(false);
  };

  const startCameraTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      cameraTestStreamRef.current = stream;
      setIsCameraTestOn(true);
    } catch (error) {
      console.error("カメラテストの起動に失敗しました:", error);
      alert("カメラの起動に失敗しました。ブラウザの設定でカメラの使用を許可してください。");
    }
  };

  const stopCameraTest = () => {
    if (cameraTestStreamRef.current) {
      cameraTestStreamRef.current.getTracks().forEach(track => track.stop());
      cameraTestStreamRef.current = null;
    }
    if (cameraTestVideoRef.current) {
      cameraTestVideoRef.current.srcObject = null;
    }
    setIsCameraTestOn(false);
  };

  const confirmCameraTest = () => {
    setCameraTestCompleted(true);
    stopCameraTest();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOn(true);
      }
    } catch (error) {
      console.error("カメラの起動に失敗しました:", error);
      alert("カメラの起動に失敗しました。ブラウザの設定でカメラの使用を許可してください。");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const startInterview = async () => {
    if (!session) return;
    
    setIsStarting(true);
    
    try {
      const response = await fetch(`/api/interview/${sessionUrl}/start`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      const data = await response.json();
      const { assistantId, publicKey, questions: remainingQuestions, startIndex, error } = data;
      
      // Store questions and metadata in refs for access in event handlers
      if (remainingQuestions) {
        allQuestionsRef.current = remainingQuestions;
      }

      // Calculate total questions from session snapshot
      const totalQuestions = session.questionsSnapshot?.length || 0;
      const resumeIndex = startIndex !== undefined ? startIndex : 0;
      
      // Store in refs for event handlers
      startIndexRef.current = resumeIndex;
      totalQuestionsRef.current = totalQuestions;
      currentQuestionIndexRef.current = resumeIndex;
      
      // Set initial question and progress
      const firstQuestion = remainingQuestions?.[0]?.text || "";
      const cleanFirstQuestion = cleanQuestionText(firstQuestion);
      setCurrentQuestion(cleanFirstQuestion);
      setCurrentQuestionIndex(resumeIndex);
      setProgress(((resumeIndex + 1) / totalQuestions) * 100);

      // If Vapi credentials are not configured, show the question text
      if (error || !publicKey || !assistantId) {
        console.warn("Vapi not configured - showing question text only");
        setIsCallActive(true);
        setIsStarting(false);
        alert("Vapi APIキーが設定されていません。質問はテキストで表示されます。\n\n質問: " + cleanFirstQuestion);
        return;
      }

      // Initialize Vapi client
      if (!vapiRef.current) {
        vapiRef.current = new Vapi(publicKey);
        
        // Set up event listeners
        vapiRef.current.on("call-start", async () => {
          console.log("Vapi call started");
          
          // Update UI to show first remaining question
          if (allQuestionsRef.current && allQuestionsRef.current.length > 0) {
            setCurrentQuestion(cleanQuestionText(allQuestionsRef.current[0].text));
            setCurrentQuestionIndex(startIndexRef.current);
            const totalQuestions = totalQuestionsRef.current || allQuestionsRef.current.length;
            setProgress(((startIndexRef.current + 1) / totalQuestions) * 100);
          }
          
          // Register call ID with server
          setTimeout(async () => {
            try {
              const vapiState = vapiRef.current as any;
              const callId = vapiState?.callId || vapiState?._callId || vapiState?.call?.id;
              
              if (callId && !registeredCallIdRef.current) {
                console.log("Found call ID:", callId);
                
                const response = await fetch(`/api/interview/${sessionUrl}/register-call`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ callId }),
                  credentials: "include",
                });
                
                if (response.ok) {
                  registeredCallIdRef.current = callId;
                  console.log("Successfully registered call ID with server");
                } else {
                  console.error("Failed to register call ID:", await response.text());
                }
              }
            } catch (error) {
              console.error("Error registering call ID:", error);
            }
          }, 300);
        });

        // Listen for messages to track conversation progress
        vapiRef.current.on("message", async (message: any) => {
          console.log("Vapi message:", message);
          
          // Track conversation progress and update UI
          if (message.type === "conversation-update") {
            const conversation = message.conversation || [];
            console.log(`Conversation has ${conversation.length} messages`);
            
            // Check if AI has started asking questions (3rd message or later)
            const botMessages = conversation.filter((m: any) => 
              m.role === "assistant" || m.role === "bot"
            );
            if (botMessages.length >= 2 && !questionStarted) {
              // AI has moved past the initial greeting
              setQuestionStarted(true);
            }
            
            // Try to detect which question is being asked by matching assistant messages
            if (allQuestionsRef.current && allQuestionsRef.current.length > 0) {
              // Count assistant messages to estimate current question
              const assistantMessages = conversation.filter((m: any) => 
                m.role === "assistant" || m.role === "bot"
              );
              
              // Try to match the last assistant message to a question
              if (assistantMessages.length > 0) {
                const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
                const messageContent = lastAssistantMessage.message || lastAssistantMessage.content || "";
                
                // Normalize text: remove punctuation and spaces for flexible matching
                const normalizeText = (text: string) => 
                  text.replace(/[。、？！\s]/g, '').toLowerCase();
                
                const normalizedMessage = normalizeText(messageContent);
                
                // Check if this is the end of interview message
                // Pattern 1: 「ありがとうございます。以上で面接は終了です。ありがとうございました。」
                // Pattern 2: 「承知しました。本件はここまでといたします。ご協力ありがとうございました。」
                const isEndMessage = normalizedMessage.includes('以上で面接は終了です') || 
                                   normalizedMessage.includes('本件はここまでといたします') ||
                                   normalizedMessage.includes('インタビューは終了です') || 
                                   normalizedMessage.includes('面接は終了です') ||
                                   normalizedMessage.includes('インタビュー終了') ||
                                   normalizedMessage.includes('面接終了');
                
                if (isEndMessage) {
                  console.log("Interview end detected in message");
                  setIsCallActive(false);
                  setProgress(100);
                  setCurrentQuestion("面接が終了しました");
                  // Show completion screen after 3 seconds
                  setTimeout(() => {
                    setSetupStep("completed");
                  }, 3000);
                  return;
                }
                
                // Find which question is being asked
                let matched = false;
                allQuestionsRef.current.forEach((q: any, relativeIndex: number) => {
                  // Clean question text first, then normalize for matching
                  const cleanQuestion = cleanQuestionText(q.text);
                  const normalizedQuestion = normalizeText(cleanQuestion);
                  
                  // Check if the message contains the question (ignoring punctuation/spaces)
                  if (normalizedMessage.includes(normalizedQuestion)) {
                    // Calculate absolute question index (startIndex + relative index in remaining questions)
                    const absoluteIndex = startIndexRef.current + relativeIndex;
                    const totalQuestions = totalQuestionsRef.current || allQuestionsRef.current.length;
                    
                    setCurrentQuestion(cleanQuestion);
                    setCurrentQuestionIndex(absoluteIndex);
                    setQuestionStarted(true);
                    setProgress(((absoluteIndex + 1) / totalQuestions) * 100);
                    currentQuestionIndexRef.current = absoluteIndex;
                    console.log(`UI updated to question ${absoluteIndex + 1}/${totalQuestions}: ${cleanQuestion}`);
                    matched = true;
                  }
                });
                
                if (!matched) {
                  console.log("No question match found for message:", messageContent);
                }
              }
            }
          }
        });

        vapiRef.current.on("speech-start", () => {
          console.log("Speech started");
          setIsSpeaking(true);
        });

        vapiRef.current.on("speech-end", () => {
          console.log("Speech ended");
          setIsSpeaking(false);
        });

        vapiRef.current.on("call-end", () => {
          console.log("Vapi call ended");
          setIsCallActive(false);
          setQuestionStarted(false);
          setProgress(100);
          setCurrentQuestion("面接が終了しました");
        });

        vapiRef.current.on("error", (error) => {
          console.error("Vapi error:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
        });
      }

      // Prepare question list for variable substitution (keep [質問X] prefix for reliable extraction)
      const questionsList = remainingQuestions
        .map((q: any) => q.text) // Keep [質問X] prefix intact
        .join('\n');
      
      console.log("Starting Vapi call with assistant:", assistantId);
      console.log("Questions list:", questionsList);
      
      // Start the call with variable values and transcriber overrides for better short utterance detection
      // Note: Include sessionUrl in variableValues since Web SDK doesn't support metadata
      const call = await vapiRef.current.start(assistantId, {
        variableValues: {
          questionsList: questionsList,
          sessionUrl: sessionUrl, // Pass sessionUrl as a variable
        },
        // Override transcriber settings for better short utterance detection
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "ja",
          smartFormat: true,
          // Lower endpointing (ms) for faster turn detection of short utterances like "はい"
          endpointing: 300,
        } as any,
      });
      
      // Set volume to maximum for mobile devices
      if (vapiRef.current && typeof (vapiRef.current as any).setVolume === 'function') {
        (vapiRef.current as any).setVolume(1.0);
      }
      
      // Set input/output devices immediately after call start
      if (vapiRef.current && typeof (vapiRef.current as any).setInputDevicesAndOutputDevice === 'function') {
        try {
          const inputDevice = selectedAudioInput || undefined;
          const outputDevice = selectedAudioOutput || undefined;
          if (inputDevice || outputDevice) {
            await (vapiRef.current as any).setInputDevicesAndOutputDevice(
              inputDevice ? [{ type: 'audio', deviceId: inputDevice }] : [],
              outputDevice
            );
            console.log("Set Vapi devices - input:", inputDevice, "output:", outputDevice);
          }
        } catch (error) {
          console.warn("Failed to set Vapi devices:", error);
        }
      }
      
      // Register call ID immediately after start
      const callId = call?.id;
      if (callId && callId !== registeredCallIdRef.current) {
        console.log("Registering call ID immediately:", callId);
        console.log("Session URL:", sessionUrl);
        console.log("Full URL:", `/api/interview/${sessionUrl}/register-call`);
        try {
          const response = await fetch(`/api/interview/${sessionUrl}/register-call`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ callId }),
            credentials: "include",
          });
          
          if (response.ok) {
            registeredCallIdRef.current = callId;
            console.log("Successfully registered call ID with server");
          } else {
            console.error("Failed to register call ID:", await response.text());
          }
        } catch (error) {
          console.error("Error registering call ID:", error);
        }
      }
      
      setIsCallActive(true);
      setIsStarting(false);
    } catch (error) {
      console.error("面接の開始に失敗しました:", error);
      setIsCallActive(false);
      setIsStarting(false);
      alert("面接の開始に失敗しました。もう一度お試しください。");
    }
  };

  const sendNextQuestion = () => {
    if (!questions || !vapiRef.current) return;
    
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      alert("すべての質問が完了しました");
      return;
    }

    const nextQuestion = questions[nextIndex];
    const cleanNext = cleanQuestionText(nextQuestion.text);
    setCurrentQuestion(cleanNext);
    setCurrentQuestionIndex(nextIndex);
    setQuestionStarted(true);
    setProgress(((nextIndex + 1) / questions.length) * 100);

    console.log("Sending next question:", cleanNext);
    // Send question to Vapi using the send method
    vapiRef.current.send({
      type: "add-message",
      message: {
        role: "system",
        content: cleanNext,
      },
    });
  };

  const endInterview = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setIsCallActive(false);
    setQuestionStarted(false);
    setCurrentQuestion("");
    setCurrentQuestionIndex(0);
    setProgress(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">面接セッションが見つかりません</h2>
            <p className="text-muted-foreground">
              URLが正しいか確認してください
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if session is already completed
  if (session.status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">面接は完了しています</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-4">こんにちは、{session.candidateName}さん</p>
              <div className="bg-muted p-6 rounded-lg">
                <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
                <p className="text-lg font-medium mb-2">
                  このセッションは既に完了しています
                </p>
                <p className="text-sm text-muted-foreground">
                  面接は既に終了しました。このURLは使用できません。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interview completion screen (shown after interview ends)
  if (setupStep === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">面接が終了しました</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="bg-green-50 dark:bg-green-950 p-8 rounded-lg">
                <CheckCircle2 className="h-20 w-20 mx-auto mb-6 text-green-600 dark:text-green-400" />
                <p className="text-xl font-medium mb-4 text-green-800 dark:text-green-200">
                  お疲れさまでした！
                </p>
                <p className="text-lg mb-2">
                  {session.candidateName}さん、ご協力ありがとうございました。
                </p>
                <p className="text-muted-foreground mb-6">
                  面接の内容は担当者に送信されました。
                </p>
                <div className="bg-background/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    このページは閉じていただいて構いません。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Welcome screen
  if (setupStep === "welcome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">AI面接システムへようこそ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg mb-2">こんにちは、{session.candidateName}さん</p>
              <p className="text-muted-foreground">
                これからAI面接を開始します
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold mb-2">音声とマイクのテスト</h3>
                <p className="text-sm text-muted-foreground">
                  面接に進む前に、スピーカーとマイクが正常に動作するか確認してください
                </p>
              </div>

              {/* Device Settings Toggle */}
              <Button
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
                variant="outline"
                size="sm"
                className="w-full"
                data-testid="button-device-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                {showDeviceSettings ? "デバイス設定を閉じる" : "スピーカー・マイクを変更する"}
              </Button>

              {/* Device Selection */}
              {showDeviceSettings && (
                <div className="bg-muted p-4 rounded-lg space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">スピーカー（音声出力）</label>
                    <Select 
                      value={selectedAudioOutput} 
                      onValueChange={(value) => {
                        setSelectedAudioOutput(value);
                        // Reset audio test if device changed
                        setAudioTestCompleted(false);
                        setShowAudioConfirm(false);
                      }}
                    >
                      <SelectTrigger data-testid="select-audio-output">
                        <SelectValue placeholder="スピーカーを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioOutputDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `スピーカー ${device.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">マイク（音声入力）</label>
                    <Select 
                      value={selectedAudioInput} 
                      onValueChange={(value) => {
                        setSelectedAudioInput(value);
                        // Reset mic test if device changed
                        if (isMicOn) {
                          if (micStreamRef.current) {
                            micStreamRef.current.getTracks().forEach(track => track.stop());
                          }
                          setIsMicOn(false);
                          setMicTestCompleted(false);
                        }
                      }}
                    >
                      <SelectTrigger data-testid="select-audio-input">
                        <SelectValue placeholder="マイクを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioInputDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label || `マイク ${device.deviceId.slice(0, 8)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    デバイスを変更した場合は、再度テストを行ってください
                  </p>
                </div>
              )}

              {/* Audio Output Test */}
              {!audioTestCompleted ? (
                <div className="space-y-3">
                  <Button
                    onClick={playTestAudio}
                    className="w-full"
                    size="lg"
                    data-testid="button-test-audio"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    音声テスト（スピーカー確認）
                  </Button>
                  
                  {showAudioConfirm && (
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <p className="text-sm font-medium">音声が聞こえましたか？</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={confirmAudioHeard}
                          variant="default"
                          className="flex-1"
                          data-testid="button-audio-yes"
                        >
                          はい、聞こえました
                        </Button>
                        <Button
                          onClick={() => setShowAudioConfirm(false)}
                          variant="outline"
                          className="flex-1"
                          data-testid="button-audio-retry"
                        >
                          もう一度テスト
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">音声テスト完了</span>
                </div>
              )}

              {!isMicOn ? (
                <Button
                  onClick={startMicrophone}
                  className="w-full"
                  size="lg"
                  data-testid="button-enable-mic"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  マイクをテストする
                </Button>
              ) : !micTestCompleted ? (
                <div className="bg-muted p-4 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Mic className="h-5 w-5" />
                    <span className="font-medium">マイクが接続されました</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">「準備ができました」と声に出してください</p>
                    <Progress value={micLevel} className="h-3" data-testid="mic-level-bar" />
                    <p className="text-xs text-muted-foreground">
                      声に反応してバーが動くことを確認してください
                    </p>
                  </div>

                  <Button
                    onClick={() => setMicTestCompleted(true)}
                    className="w-full"
                    data-testid="button-confirm-mic"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    マイク確認完了
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">マイクテスト完了</span>
                </div>
              )}

              {/* Camera Test */}
              {!cameraTestCompleted ? (
                <div className="space-y-3">
                  {!isCameraTestOn ? (
                    <Button
                      onClick={startCameraTest}
                      className="w-full"
                      size="lg"
                      data-testid="button-test-camera"
                    >
                      <Video className="h-5 w-5 mr-2" />
                      カメラをテストする
                    </Button>
                  ) : (
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">カメラプレビュー</p>
                        <Badge variant="default" className="text-xs">テスト中</Badge>
                      </div>
                      <div className="relative">
                        <video
                          ref={cameraTestVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full aspect-video rounded-lg bg-black object-cover"
                          data-testid="video-camera-test"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        自分の姿が映っていることを確認してください
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={confirmCameraTest}
                          variant="default"
                          className="flex-1"
                          data-testid="button-camera-yes"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          はい、映っています
                        </Button>
                        <Button
                          onClick={stopCameraTest}
                          variant="outline"
                          className="flex-1"
                          data-testid="button-camera-retry"
                        >
                          もう一度テスト
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">カメラテスト完了</span>
                </div>
              )}
            </div>

            {audioTestCompleted && micTestCompleted && cameraTestCompleted && (
              <div className="space-y-3">
                <Button
                  onClick={() => setSetupStep("confirm")}
                  className="w-full"
                  size="lg"
                  data-testid="button-start-setup"
                >
                  面接画面へ進む
                </Button>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>ご案内：</strong> 面接画面では、AIが音声で質問します。音声でお答えください。
                  </p>
                </div>
              </div>
            )}
            
            {audioTestCompleted && !micTestCompleted && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>次のステップ：</strong> マイクをテストしてください
                </p>
              </div>
            )}
            
            {audioTestCompleted && micTestCompleted && !cameraTestCompleted && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>次のステップ：</strong> カメラをテストしてください
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Confirmation screen
  if (setupStep === "confirm") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">面接を開始します</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 p-6 rounded-lg space-y-3">
              <p className="text-lg font-medium text-center">
                ご案内
              </p>
              <p className="text-sm text-foreground">
                面接画面では、AIが音声で質問します。音声でお答えください。
              </p>
              <p className="text-sm text-foreground">
                <strong>ヒント：</strong> AIが「準備はよろしいですか？」と聞いたら、「<strong>はい、準備ができました</strong>」とはっきりお答えください。
              </p>
            </div>

            <div className="text-center">
              <p className="text-xl font-semibold mb-6">準備はいいですか？</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setSetupStep("welcome")}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                  data-testid="button-back-to-test"
                >
                  テスト画面に戻る
                </Button>
                <Button
                  onClick={() => setSetupStep("ready")}
                  className="flex-1"
                  size="lg"
                  data-testid="button-confirm-start"
                >
                  はい、開始します
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main interview interface (ready state)
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 relative">
      {/* Loading Overlay */}
      {isStarting && !isCallActive && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AIと接続中...</h3>
                  <p className="text-sm text-muted-foreground">少々お待ちください</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-interview-title">
            AI面接システム
          </h1>
          <p className="text-muted-foreground">
            ようこそ、{session.candidateName}さん
          </p>
          <Badge variant={isCallActive ? "default" : "secondary"}>
            {isCallActive ? "面接中" : "待機中"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>カメラプレビュー</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isCameraOn ? stopCamera : startCamera}
                    data-testid="button-toggle-camera"
                  >
                    {isCameraOn ? (
                      <>
                        <VideoOff className="h-4 w-4 mr-2" />
                        カメラOFF
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 mr-2" />
                        カメラON
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="relative h-full min-h-[500px] bg-muted rounded-lg overflow-hidden">
                  {/* Current Question Overlay */}
                  {isCallActive && currentQuestion && questionStarted && (
                    <div className="absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-4 z-10">
                      <p className="text-lg font-medium text-center" data-testid="text-current-question">
                        {currentQuestion}
                      </p>
                    </div>
                  )}
                  
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    data-testid="video-preview"
                  />
                  {!isCameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          カメラがオフになっています
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* User Waveform Overlay */}
                  {isCallActive && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
                      <CircularWaveform 
                        isActive={isUserSpeaking}
                        statusText={isUserSpeaking ? "回答中" : "待機中"}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interview Controls */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>面接コントロール</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isCallActive && !isStarting && (
                  <Button
                    onClick={startInterview}
                    className="w-full"
                    size="lg"
                    disabled={!session.questionsSnapshot || session.questionsSnapshot.length === 0}
                    data-testid="button-start-interview"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    面接を開始
                  </Button>
                )}
                
                {isCallActive && (
                  <Button
                    onClick={endInterview}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                    data-testid="button-end-interview"
                  >
                    <PhoneOff className="h-5 w-5 mr-2" />
                    面接を終了
                  </Button>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">進捗</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} data-testid="progress-interview" />
                </div>

                {session.questionsSnapshot && session.questionsSnapshot.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      {isCallActive 
                        ? `現在: ${currentQuestionIndex + 1} / ${session.questionsSnapshot.length}`
                        : `質問数: ${session.questionsSnapshot.length}`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Interviewer Waveform */}
            {isCallActive && (
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle>面接官の音声</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                  <CircularWaveform 
                    isActive={isSpeaking}
                    statusText={isSpeaking ? "面接官が話しています..." : "待機中"}
                    color="accent"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
