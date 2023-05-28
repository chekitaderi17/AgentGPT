import type { ForwardedRef, ReactNode } from "react";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { useTranslation } from "next-i18next";
import {
  FaClipboard,
  FaImage,
  FaSave,
  FaPlay,
  FaPause,
  FaEdit,
  FaCheck,
  FaTimes,
  FaEllipsisV,
  FaTrashAlt,
} from "react-icons/fa";
import PopIn from "./motions/popin";
import Expand from "./motions/expand";
import * as htmlToImage from "html-to-image";
import WindowButton from "./WindowButton";
import IconButton from "./IconButton";
import PDFButton from "./pdf/PDFButton";
import FadeIn from "./motions/FadeIn";
import Menu from "./Menu";
import type { Message } from "../types/agentTypes";
import {
  AUTOMATIC_MODE,
  getTaskStatus,
  isAction,
  isTask,
  MESSAGE_TYPE_GOAL,
  MESSAGE_TYPE_SYSTEM,
  MESSAGE_TYPE_THINKING,
  PAUSE_MODE,
  TASK_STATUS_COMPLETED,
  TASK_STATUS_EXECUTING,
  TASK_STATUS_FINAL,
  TASK_STATUS_STARTED,
} from "../types/agentTypes";
import clsx from "clsx";
import { getMessageContainerStyle, getTaskStatusIcon } from "./utils/helpers";
import { useAgentStore, useMessageStore } from "../stores";
import { AnimatePresence } from "framer-motion";
import { CgExport } from "react-icons/cg";
import MarkdownRenderer from "./MarkdownRenderer";
import { Switch } from "./Switch";

interface ChatWindowProps extends HeaderProps {
  children?: ReactNode;
  className?: string;
  fullscreen?: boolean;
  scrollToBottom?: boolean;
  displaySettings?: boolean; // Controls if settings are displayed at the bottom of the ChatWindow
  openSorryDialog?: () => void;
  setAgentRun?: (name: string, goal: string) => void;
  visibleOnMobile?: boolean;
}

const messageListId = "chat-window-message-list";

const ChatWindow = ({
  messages,
  children,
  className,
  title,
  onSave,
  fullscreen,
  scrollToBottom,
  displaySettings,
  openSorryDialog,
  setAgentRun,
  visibleOnMobile,
}: ChatWindowProps) => {
  const [t] = useTranslation();
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAgentPaused = useAgentStore.use.isAgentPaused();
  const agentMode = useAgentStore.use.agentMode();
  const agent = useAgentStore.use.agent();
  const updateAgentMode = useAgentStore.use.updateAgentMode();

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    // Use has scrolled if we have scrolled up at all from the bottom
    const hasUserScrolled = scrollTop < scrollHeight - clientHeight - 10;
    setHasUserScrolled(hasUserScrolled);
  };

  useEffect(() => {
    // Scroll to bottom on re-renders
    if (scrollToBottom && scrollRef && scrollRef.current) {
      if (!hasUserScrolled) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  });

  const handleUpdateAgentMode = (value: boolean) => {
    updateAgentMode(value ? PAUSE_MODE : AUTOMATIC_MODE);
  };

  return (
    <div
      className={clsx(
        "border-translucent w-full flex-col rounded-2xl border-2 border-white/20 bg-zinc-900 text-white shadow-2xl drop-shadow-lg xl:flex",
        className,
        visibleOnMobile ? "flex" : "hidden"
      )}
    >
      <MacWindowHeader title={title} messages={messages} onSave={onSave} />
      <div
        className={clsx(
          "mb-2 mr-2 ",
          (fullscreen && "max-h-[75vh] flex-grow overflow-auto") || "window-heights"
        )}
        ref={scrollRef}
        onScroll={handleScroll}
        id={messageListId}
      >
        {agent !== null && agentMode === PAUSE_MODE && isAgentPaused && (
          <FaPause className="animation-hide absolute left-1/2 top-1/2 text-lg md:text-3xl" />
        )}
        {agent !== null && agentMode === PAUSE_MODE && !isAgentPaused && (
          <FaPlay className="animation-hide absolute left-1/2 top-1/2 text-lg md:text-3xl" />
        )}
        {messages.map((message, index) => {
          if (getTaskStatus(message) === TASK_STATUS_EXECUTING) {
            return null;
          }

          return (
            <FadeIn key={`${index}-${message.type}`}>
              <ChatMessage message={message} />
            </FadeIn>
          );
        })}
        {children}

        {messages.length === 0 && (
          <>
            <PopIn delay={0.8}>
              <ChatMessage
                message={{
                  type: MESSAGE_TYPE_SYSTEM,
                  value: "👉 " + t("CREATE_AN_AGENT_DESCRIPTION", { ns: "chat" }),
                }}
              />
            </PopIn>
            <PopIn delay={1.5}>
              <div className="m-2 flex flex-col justify-between gap-2 sm:m-4 sm:flex-row">
                <ExampleAgentButton name="PlatformerGPT 🎮" setAgentRun={setAgentRun}>
                  Write some code to make a platformer game.
                </ExampleAgentButton>
                <ExampleAgentButton name="TravelGPT 🌴" setAgentRun={setAgentRun}>
                  Plan a detailed trip to Hawaii.
                </ExampleAgentButton>
                <ExampleAgentButton name="ResearchGPT 📜" setAgentRun={setAgentRun}>
                  Create a comprehensive report of the Nike company
                </ExampleAgentButton>
              </div>
            </PopIn>
          </>
        )}
      </div>
      {displaySettings && (
        <div className="flex flex-row items-center justify-center">
          <SwitchContainer label={PAUSE_MODE}>
            <Switch
              disabled={agent !== null}
              value={agentMode === PAUSE_MODE}
              onChange={handleUpdateAgentMode}
            />
          </SwitchContainer>
        </div>
      )}
    </div>
  );
};

const SwitchContainer = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <div className="m-1 flex w-36 items-center justify-center gap-2 rounded-lg border-[2px] border-white/20 bg-zinc-700 px-2 py-1">
      <p className="font-mono text-sm">{label}</p>
      {children}
    </div>
  );
};

const ExampleAgentButton = ({
  name,
  children,
  setAgentRun,
}: {
  name: string;
  children: string;
  setAgentRun?: (name: string, goal: string) => void;
}) => {
  const handleClick = () => {
    if (setAgentRun) {
      setAgentRun(name, children);
    }
  };

  return (
    <div
      className={clsx(
        `w-full p-2 sm:w-[33%]`,
        `cursor-pointer rounded-lg font-mono text-sm sm:text-base`,
        `border-2 border-white/20 bg-gradient-to-t from-sky-500 to-sky-600 transition-all hover:bg-gradient-to-t hover:from-sky-400 hover:to-sky-600`
      )}
      onClick={handleClick}
    >
      <p className="text-lg font-black">{name}</p>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
};

interface HeaderProps {
  title?: string | ReactNode;
  messages: Message[];
  onSave?: (format: string) => void;
}

const MacWindowHeader = (props: HeaderProps) => {
  const [t] = useTranslation();
  const isAgentPaused = useAgentStore.use.isAgentPaused();
  const agent = useAgentStore.use.agent();
  const agentMode = useAgentStore.use.agentMode();
  const saveElementAsImage = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    htmlToImage
      .toJpeg(element, {
        height: element.scrollHeight,
        style: {
          overflowY: "visible",
          maxHeight: "none",
          border: "none",
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "agent-gpt-output.png";
        link.click();
      })
      .catch(() =>
        alert("Error saving image! Note this doesn't work if the AI generated an image")
      );
  };

  const copyElementText = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    const text = element.innerText;

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    } else {
      // Fallback to a different method for unsupported browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard");
      } catch (err) {
        console.error("Unable to copy text to clipboard", err);
      }

      document.body.removeChild(textArea);
    }
  };

  const exportOptions = [
    <WindowButton
      key="Image"
      onClick={(): void => saveElementAsImage(messageListId)}
      icon={<FaImage size={12} />}
      name={`${t("IMAGE", { ns: "common" })}`}
      styleClass={{ container: "text-sm hover:bg-white/10" }}
    />,
    <WindowButton
      key="Copy"
      onClick={(): void => copyElementText(messageListId)}
      icon={<FaClipboard size={12} />}
      name={`${t("COPY", { ns: "common" })}`}
      styleClass={{ container: "text-sm hover:bg-white/10" }}
    />,
    <PDFButton key="PDF" name="PDF" messages={props.messages} />,
  ];

  return (
    <div className="flex items-center gap-1 overflow-visible rounded-t-3xl p-3">
      <PopIn delay={0.4}>
        <div className="h-3 w-3 rounded-full bg-red-500" />
      </PopIn>
      <PopIn delay={0.5}>
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
      </PopIn>
      <PopIn delay={0.6}>
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </PopIn>
      <Expand
        delay={1}
        className="invisible flex flex-grow font-mono text-sm font-bold text-gray-500 sm:ml-2 md:visible"
      >
        {props.title}
      </Expand>

      {agentMode === PAUSE_MODE && agent !== null && (
        <div
          className={`animation-duration text-gray/50 invisible flex items-center gap-2 px-2 py-1 text-left font-mono text-sm font-bold transition-all sm:py-0.5 md:visible`}
        >
          {isAgentPaused ? (
            <>
              <FaPause />
              <p className="font-mono">{`${t("PAUSED", { ns: "common" })}`}</p>
            </>
          ) : (
            <>
              <FaPlay />
              <p className="font-mono">{`${t("RUNNING", { ns: "common" })}`}</p>
            </>
          )}
        </div>
      )}

      <AnimatePresence>
        {props.onSave && (
          <PopIn>
            <WindowButton
              ping
              key="Agent"
              onClick={() => props.onSave?.("db")}
              icon={<FaSave size={12} />}
              name={`${t("SAVE", { ns: "common" })}`}
              border
              styleClass={{ container: "text-sm hover:bg-white/10" }}
            />
          </PopIn>
        )}
      </AnimatePresence>

      <Menu name="Export" icon={<CgExport size={15} />} items={exportOptions} />
    </div>
  );
};
const ChatMessage = ({ message }: { message: Message; className?: string }) => {
  const [t] = useTranslation();
  const isAgentPaused = useAgentStore.use.isAgentPaused();
  const updateMessage = useMessageStore.use.updateMessage();
  const deleteMessage = useMessageStore.use.deleteMessage();
  const latestIteration = useMessageStore.use.latestIteration();

  const isLatestMessage = message.iteration === latestIteration || latestIteration === 0;
  const isMutableMessage =
    isLatestMessage && isTask(message) && message.status === TASK_STATUS_STARTED && !!isAgentPaused;

  const [isTextAreaDisabled, setIsTextAreaDisabled] = useState(true);
  const [textAreaValue, setTextAreaValue] = useState(message.value);

  const messageButtonGroupRef = useRef<HTMLDivElement>(null);
  const editButtonGroupRef = useRef<HTMLDivElement>(null);
  const messageIconRef = useRef<HTMLDivElement>(null);
  const messagePrefixRef = useRef<HTMLSpanElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    toggleEditMessageStyles(!isTextAreaDisabled);
  }, [isTextAreaDisabled]);

  useEffect(() => {
    if (isAgentPaused) {
      return;
    }
    setIsTextAreaDisabled(true);
  }, [isAgentPaused]);

  const toggleEditMessageStyles = (active) => {
    const initial = "initial";
    const none = "none";
    const inlineFlex = "inline-flex";
    const display = active ? none : initial;

    if (messageButtonGroupRef.current) {
      messageButtonGroupRef.current.style.display = active ? none : inlineFlex;
    }

    if (editButtonGroupRef.current) {
      editButtonGroupRef.current.style.display = active ? inlineFlex : none;
    }

    if (messageIconRef.current) {
      messageIconRef.current.style.display = active ? none : "inline-block";
    }

    if (messagePrefixRef.current) {
      messagePrefixRef.current.style.display = display;
    }

    if (textAreaRef.current) {
      textAreaRef.current.style.width = active ? "100%" : initial;
      textAreaRef.current.style.backgroundColor = active ? "#545454" : initial;
    }
  };

  const saveEdit = () => {
    setTextAreaValue((prevTextAreaValue) => prevTextAreaValue.trim());

    const updatedMessage = { ...message, value: textAreaValue };
    updateMessage(updatedMessage);

    setIsTextAreaDisabled(true);
  };

  const cancelEdit = () => {
    setIsTextAreaDisabled(true);
  };

  const handleEditMessage = () => {
    setIsTextAreaDisabled(false);
  };

  const handleMessageKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isSaveMessage = e.key === "Enter" && !e.shiftKey;

    if (isSaveMessage && isTask(message)) {
      saveEdit();
    }

    if (isSaveMessage || e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleMessageInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextAreaValue(e.currentTarget.value);
  };

  const editButtonGroup = (
    <ButtonGroup styleClass={{ container: "float-right" }} ref={editButtonGroupRef}>
      <IconButton
        key="save"
        name="Save"
        styleClass={{
          container: "w-8 h-8 hover:text-green-400 px-2 cursor-pointer",
        }}
        icon={<FaCheck />}
        toolTipProperties={{
          message: "Save",
          disabled: false,
        }}
        onClick={() => saveEdit()}
      />
      <IconButton
        key="cancel"
        name="Cancel"
        styleClass={{
          container: "w-8 h-8 hover:text-red-500 px-2",
        }}
        icon={<FaTimes />}
        toolTipProperties={{
          message: "Cancel",
          disabled: false,
        }}
        onClick={() => cancelEdit()}
      />
    </ButtonGroup>
  );

  const messageOptions = [
    <WindowButton
      key="edit"
      onClick={handleEditMessage}
      icon={<FaEdit />}
      name="Edit"
      styleClass={{
        container: "text-xs bg-zinc-900 rounded-sm hover:bg-[#1E88E5]",
      }}
    />,
    <WindowButton
      key="delete"
      onClick={() => deleteMessage(message)}
      icon={<FaTrashAlt />}
      name="Delete"
      styleClass={{
        container: "text-xs bg-zinc-900 rounded-sm text-red-500 hover:bg-red-500 hover:text-white",
      }}
    />,
  ];

  return (
    <div
      className={`${getMessageContainerStyle(
        message
      )} relative mx-2 my-1 rounded-lg border-[1px] bg-white/20 px-2 pt-2 font-mono text-xs hover:border-[#1E88E5]/40 sm:mx-4 sm:my-1.5 sm:px-3 sm:pt-3 sm:text-base sm:text-sm ${
        isTextAreaDisabled ? "pb-2 hover:bg-white/[0.3] sm:pb-3" : ""
      } ${isMutableMessage ? "bg-white/[0.35]" : ""} 
        `}
      onTouchStart={handleEditMessage}
      onDoubleClick={handleEditMessage}
    >
      {message.type != MESSAGE_TYPE_SYSTEM && (
        // Avoid for system messages as they do not have an icon and will cause a weird space
        <>
          <div className="mr-2 inline-block h-[0.9em] align-top" ref={messageIconRef}>
            {getTaskStatusIcon(message, {})}
          </div>
          <span className="mr-2 align-top font-bold" ref={messagePrefixRef}>
            {t(getMessagePrefix(message), { ns: "chat" })}
          </span>
        </>
      )}

      {message.type == MESSAGE_TYPE_THINKING && (
        <span className="italic text-zinc-400">
          {`${t("RESTART_IF_IT_TAKES_X_SEC", {
            ns: "chat",
          })}`}
        </span>
      )}

      {isAction(message) ? (
        <>
          <hr className="my-2 border-[1px] border-white/20" />
          <div className="prose">
            <MarkdownRenderer>{message.info || ""}</MarkdownRenderer>
          </div>
        </>
      ) : (
        <>
          {isMutableMessage && !isTextAreaDisabled ? (
            <div className="inline-block w-full">
              <textarea
                className="lg:3/4 resize-none rounded-md border-none bg-transparent p-1.5 align-middle font-mono text-sm focus-visible:outline-none sm:text-base"
                aria-label="Edit Task Message"
                value={textAreaValue}
                ref={textAreaRef}
                disabled={isTextAreaDisabled}
                onKeyUp={handleMessageKeyUp}
                onInput={handleMessageInput}
                maxLength={2000}
                rows={3}
              />
              {editButtonGroup}
            </div>
          ) : (
            <span className="break-words">{t(message.value, { ns: "chat" })}</span>
          )}
          {
            // Link to the FAQ if it is a shutdown message
            message.type == MESSAGE_TYPE_SYSTEM &&
              (message.value.toLowerCase().includes("shut") ||
                message.value.toLowerCase().includes("error")) && <FAQ />
          }
        </>
      )}
      {isMutableMessage && isTextAreaDisabled && (
        <Menu
          name="More"
          variant="minimal"
          icon={<FaEllipsisV />}
          items={messageOptions}
          styleClass={{
            container: "absolute right-0 top-0 inline-flex bg-transparent ",
            input: ` animation-duration text-sm md:text-md font-mono text-gray/50 transition-all py-1 sm:py-2 sm:px-1 hover:text-white/50`,
            optionsContainer: "right-0 top-4 md:top-5 w-24 rounded-md border-[4px] border-zinc-900",
            option: "w-full",
          }}
        />
      )}
    </div>
  );
};

interface ButtonGroupProps {
  children: React.ReactNode;
  styleClass?: { [key: string]: string };
}

const ButtonGroup = forwardRef(
  ({ children, styleClass }: ButtonGroupProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div className={`${styleClass?.container || ""}`} role="group" ref={ref}>
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = "ButtonGroup";

// Returns the translation key of the prefix
const getMessagePrefix = (message: Message) => {
  if (message.type === MESSAGE_TYPE_GOAL) {
    return "EMBARKING_ON_NEW_GOAL";
  } else if (message.type === MESSAGE_TYPE_THINKING) {
    return "THINKING";
  } else if (getTaskStatus(message) === TASK_STATUS_STARTED) {
    return "TASK_ADDED";
  } else if (getTaskStatus(message) === TASK_STATUS_COMPLETED) {
    return `Completing: ${message.value}`;
  } else if (getTaskStatus(message) === TASK_STATUS_FINAL) {
    return "NO_MORE_TASKS";
  }
  return "";
};

const FAQ = () => {
  return (
    <p>
      <br />
      If you are facing issues, please head over to our{" "}
      <a href="https://docs.reworkd.ai/faq" className="text-sky-500">
        FAQ
      </a>
    </p>
  );
};
export default ChatWindow;
export { ChatMessage };
