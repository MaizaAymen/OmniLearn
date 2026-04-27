import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message as antdMessage,
} from "antd";
import {
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  FormOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, getCurrentUser, getSocket } from "./api";

const { Title, Text } = Typography;

const PALETTE = {
  bg:        "#FAFAF7",
  surface:   "#FFFFFF",
  border:    "#ECECE8",
  borderSoft:"#F4F4F0",
  text:      "#1F2937",
  textSoft:  "#6B7280",
  accent:    "#4F46E5",
  accentSoft:"#EEF2FF",
  bubbleMine:"#4F46E5",
  bubbleTheirs: "#F3F4F6",
};

const initialsOf = (u) =>
  `${(u?.firstname || "")[0] || ""}${(u?.lastname || "")[0] || ""}`.toUpperCase() ||
  (u?.email?.[0] || "?").toUpperCase();

const fullName = (u) =>
  `${u?.firstname || ""} ${u?.lastname || ""}`.trim() || u?.email || "Unknown";

const formatTime = (d) => {
  const day = dayjs(d);
  if (day.isSame(dayjs(), "day")) return day.format("HH:mm");
  if (day.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return day.format("MMM D");
};

const Messages = () => {
  const me = getCurrentUser();
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [usersById, setUsersById] = useState({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const listEndRef = useRef(null);
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // Bootstrap: load conversations + cache users for display.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [convs, users] = await Promise.all([
          api.listConversations(),
          api.searchUsers(""),
        ]);
        if (cancelled) return;
        setConversations(convs);
        const map = {};
        for (const u of users) map[u.id] = u;
        if (me) map[me.id] = me;
        setUsersById(map);
      } catch (e) {
        antdMessage.error("Failed to load conversations");
      } finally {
        if (!cancelled) setLoadingConvs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Wire socket: join rooms and listen for new messages.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.conversationId === activeIdRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      // Bump conversation to top of list.
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) return prev;
        const next = [...prev];
        const [conv] = next.splice(idx, 1);
        return [{ ...conv, updatedAt: new Date().toISOString() }, ...next];
      });
    };

    socket.on("message:new", onMessage);
    return () => { socket.off("message:new", onMessage); };
  }, []);

  // When the active conversation changes, load its history + join its room.
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    const socket = getSocket();
    socket?.emit("conversation:join", { conversationId: activeId });
    setLoadingMsgs(true);
    api.listMessages(activeId)
      .then(setMessages)
      .catch(() => antdMessage.error("Failed to load messages"))
      .finally(() => setLoadingMsgs(false));
    return () => {
      socket?.emit("conversation:leave", { conversationId: activeId });
    };
  }, [activeId]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const conversationLabel = (conv) => {
    if (conv.type === "group") return conv.name || "Group";
    const otherId = (conv.members || []).find((id) => id !== me?.id);
    const other = usersById[otherId];
    return other ? fullName(other) : "Direct message";
  };

  const conversationAvatar = (conv) => {
    if (conv.type === "group") {
      return (
        <Avatar style={{ background: PALETTE.accentSoft, color: PALETTE.accent, fontWeight: 600 }}>
          <TeamOutlined />
        </Avatar>
      );
    }
    const otherId = (conv.members || []).find((id) => id !== me?.id);
    const other = usersById[otherId];
    return (
      <Avatar style={{ background: PALETTE.accent, color: "#fff", fontWeight: 600 }}>
        {other ? initialsOf(other) : <UserOutlined />}
      </Avatar>
    );
  };

  const filteredConvs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => conversationLabel(c).toLowerCase().includes(q));
  }, [conversations, filter, usersById]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(activeId, text);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setDraft("");
    } catch {
      antdMessage.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const onCreateGroup = async ({ name, memberIds }) => {
    const conv = await api.createGroup(name, memberIds);
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  };

  const onStartPrivate = async ({ recipientId, content }) => {
    const { conversation, message: msg } = await api.sendPrivate(recipientId, content);
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id);
      return exists ? prev : [conversation, ...prev];
    });
    setActiveId(conversation.id);
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  };

  const onInvite = async (userId) => {
    if (!activeConv) return;
    const updated = await api.invite(activeConv.id, userId);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const onRename = async (newName) => {
    if (!activeConv) return;
    const updated = await api.renameGroup(activeConv.id, newName);
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    antdMessage.success("Group renamed");
  };

  const onDelete = async () => {
    if (!activeConv) return;
    try {
      await api.deleteGroup(activeConv.id);
      setConversations((prev) => prev.filter((c) => c.id !== activeConv.id));
      setActiveId(null);
      antdMessage.success("Group deleted");
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Failed to delete group");
    }
  };

  const isOwner = activeConv?.type === "group" && activeConv?.ownerId === me?.id;

  const onLeave = async () => {
    if (!activeConv) return;
    try {
      await api.leaveGroup(activeConv.id);
      setConversations((prev) => prev.filter((c) => c.id !== activeConv.id));
      setActiveId(null);
      antdMessage.success("You left the group");
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Failed to leave");
    }
  };

  const onBan = async (userId) => {
    if (!activeConv) return;
    try {
      const updated = await api.banUser(activeConv.id, userId);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      antdMessage.success("User banned");
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Failed to ban");
    }
  };

  return (
    <div
      style={{
        background: PALETTE.bg,
        minHeight: "calc(100vh - 112px)",
        margin: -24,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 16,
          height: "calc(100vh - 160px)",
          minHeight: 560,
        }}
      >
        {/* ── Sidebar: conversation list ─────────────────────── */}
        <div
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "20px 20px 12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Title level={4} style={{ margin: 0, color: PALETTE.text, fontWeight: 700 }}>
                Messages
              </Title>
              <Tooltip title="New direct message">
                <Button
                  shape="circle"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => setPrivateOpen(true)}
                />
              </Tooltip>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: PALETTE.textSoft }} />}
              placeholder="Search conversations"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: PALETTE.bg,
                border: `1px solid ${PALETTE.borderSoft}`,
                borderRadius: 10,
              }}
            />
            <Button
              block
              icon={<PlusOutlined />}
              onClick={() => setGroupOpen(true)}
              style={{
                marginTop: 12,
                height: 40,
                borderRadius: 10,
                background: PALETTE.accentSoft,
                color: PALETTE.accent,
                border: "none",
                fontWeight: 600,
              }}
            >
              New group
            </Button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
            {loadingConvs ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <Spin />
              </div>
            ) : filteredConvs.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No conversations yet"
                style={{ marginTop: 32 }}
              />
            ) : (
              filteredConvs.map((conv) => {
                const isActive = conv.id === activeId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveId(conv.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 12px",
                      borderRadius: 12,
                      border: "none",
                      cursor: "pointer",
                      background: isActive ? PALETTE.accentSoft : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = PALETTE.borderSoft;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {conversationAvatar(conv)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Text
                          strong
                          ellipsis
                          style={{ color: PALETTE.text, fontSize: 14 }}
                        >
                          {conversationLabel(conv)}
                        </Text>
                        <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>
                          {formatTime(conv.updatedAt || conv.createdAt)}
                        </Text>
                      </div>
                      <Text
                        ellipsis
                        style={{ color: PALETTE.textSoft, fontSize: 12 }}
                      >
                        {conv.type === "group"
                          ? `${(conv.members || []).length} members`
                          : "Direct message"}
                      </Text>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Main: active conversation ──────────────────────── */}
        <div
          style={{
            background: PALETTE.surface,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {!activeConv ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center", color: PALETTE.textSoft }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: PALETTE.accentSoft,
                    color: PALETTE.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    marginBottom: 16,
                  }}
                >
                  <SendOutlined />
                </div>
                <Title level={4} style={{ color: PALETTE.text, margin: 0 }}>
                  Pick a conversation
                </Title>
                <Text style={{ color: PALETTE.textSoft }}>
                  Or start a new one from the panel on the left.
                </Text>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: `1px solid ${PALETTE.borderSoft}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: PALETTE.surface,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {conversationAvatar(activeConv)}
                  <div>
                    <Space size={6} align="center">
                      <Text strong style={{ color: PALETTE.text, fontSize: 15 }}>
                        {conversationLabel(activeConv)}
                      </Text>
                      {isOwner && (
                        <Tooltip title="You own this group">
                          <CrownOutlined style={{ color: "#D97706" }} />
                        </Tooltip>
                      )}
                    </Space>
                    <div>
                      <Tag
                        style={{
                          background: PALETTE.bg,
                          color: PALETTE.textSoft,
                          fontSize: 11,
                          marginTop: 2,
                          border: "none",
                        }}
                      >
                        {activeConv.type === "group" ? "Group" : "Private"}
                      </Tag>
                      <Text style={{ color: PALETTE.textSoft, fontSize: 12 }}>
                        {(activeConv.members || []).length} member
                        {(activeConv.members || []).length !== 1 ? "s" : ""}
                        {isOwner && (activeConv.pendingInvites || []).length > 0 && (
                          <> · {(activeConv.pendingInvites || []).length} pending</>
                        )}
                      </Text>
                    </div>
                  </div>
                </div>
                {activeConv.type === "group" && isOwner && (
                  <Space>
                    <Button
                      icon={<TeamOutlined />}
                      onClick={() => setMembersOpen(true)}
                      style={{ borderRadius: 10 }}
                    >
                      Members
                    </Button>
                    <Button
                      icon={<UserAddOutlined />}
                      onClick={() => setInviteOpen(true)}
                      style={{ borderRadius: 10 }}
                    >
                      Invite
                    </Button>
                    <Button
                      icon={<FormOutlined />}
                      onClick={() => setRenameOpen(true)}
                      style={{ borderRadius: 10 }}
                    >
                      Rename
                    </Button>
                    <Popconfirm
                      title="Delete this group?"
                      description="All messages will be removed and members notified."
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                      cancelText="Cancel"
                      onConfirm={onDelete}
                    >
                      <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 10 }}>
                        Delete
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
                {activeConv.type === "group" && !isOwner && (
                  <Popconfirm
                    title="Leave this group?"
                    okText="Leave"
                    cancelText="Cancel"
                    onConfirm={onLeave}
                  >
                    <Button danger icon={<LogoutOutlined />} style={{ borderRadius: 10 }}>
                      Leave
                    </Button>
                  </Popconfirm>
                )}
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "20px 24px",
                  background: PALETTE.bg,
                }}
              >
                {loadingMsgs ? (
                  <div style={{ textAlign: "center", padding: 40 }}>
                    <Spin />
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", marginTop: 40, color: PALETTE.textSoft }}>
                    <Text style={{ color: PALETTE.textSoft }}>
                      No messages yet — say hello.
                    </Text>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const mine = msg.senderId === me?.id;
                    const sender = usersById[msg.senderId];
                    const prev = messages[i - 1];
                    const showAvatar = !mine && (!prev || prev.senderId !== msg.senderId);
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: mine ? "flex-end" : "flex-start",
                          alignItems: "flex-end",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        {!mine && (
                          <div style={{ width: 32, flexShrink: 0 }}>
                            {showAvatar && (
                              <Avatar
                                size={32}
                                style={{
                                  background: PALETTE.accent,
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {sender ? initialsOf(sender) : <UserOutlined />}
                              </Avatar>
                            )}
                          </div>
                        )}
                        <div style={{ maxWidth: "70%" }}>
                          {showAvatar && !mine && activeConv.type === "group" && (
                            <Text
                              style={{
                                color: PALETTE.textSoft,
                                fontSize: 11,
                                marginLeft: 4,
                                marginBottom: 2,
                                display: "block",
                              }}
                            >
                              {sender ? fullName(sender) : "Unknown"}
                            </Text>
                          )}
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: 16,
                              background: mine ? PALETTE.bubbleMine : PALETTE.surface,
                              color: mine ? "#fff" : PALETTE.text,
                              border: mine ? "none" : `1px solid ${PALETTE.border}`,
                              borderBottomRightRadius: mine ? 4 : 16,
                              borderBottomLeftRadius: mine ? 16 : 4,
                              fontSize: 14,
                              lineHeight: 1.45,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.content}
                          </div>
                          <Text
                            style={{
                              color: PALETTE.textSoft,
                              fontSize: 10,
                              marginTop: 4,
                              display: "block",
                              textAlign: mine ? "right" : "left",
                              padding: "0 4px",
                            }}
                          >
                            {dayjs(msg.createdAt).format("HH:mm")}
                          </Text>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={listEndRef} />
              </div>

              {/* Composer */}
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: `1px solid ${PALETTE.borderSoft}`,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  background: PALETTE.surface,
                }}
              >
                <Input.TextArea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Write a message…"
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  style={{
                    flex: 1,
                    background: PALETTE.bg,
                    border: `1px solid ${PALETTE.borderSoft}`,
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 14,
                    resize: "none",
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sending}
                  disabled={!draft.trim()}
                  style={{
                    background: PALETTE.accent,
                    border: "none",
                    height: 40,
                    width: 40,
                    borderRadius: 12,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <NewGroupModal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreate={onCreateGroup}
      />
      <NewPrivateModal
        open={privateOpen}
        onClose={() => setPrivateOpen(false)}
        onSend={onStartPrivate}
      />
      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={onInvite}
        excludeIds={[
          ...(activeConv?.members || []),
          ...(activeConv?.pendingInvites || []),
        ]}
      />
      <RenameGroupModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        currentName={activeConv?.name || ""}
        onRename={onRename}
      />
      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        conversation={activeConv}
        usersById={usersById}
        meId={me?.id}
        onBan={onBan}
      />
    </div>
  );
};

const MembersModal = ({ open, onClose, conversation, usersById, meId, onBan }) => {
  if (!conversation) return null;
  return (
    <Modal open={open} onCancel={onClose} title="Members" footer={null} centered>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
        {(conversation.members || []).map((id) => {
          const u = usersById[id];
          const isOwner = id === conversation.ownerId;
          return (
            <div
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: "1px solid #ECECE8",
                borderRadius: 10,
                background: "#FAFAF7",
              }}
            >
              <Avatar style={{ background: "#4F46E5", color: "#fff", fontWeight: 600 }}>
                {u ? initialsOf(u) : <UserOutlined />}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong>{u ? fullName(u) : "Unknown"}</Typography.Text>
                {isOwner && (
                  <Tag color="gold" style={{ marginLeft: 8 }}>
                    Owner
                  </Tag>
                )}
              </div>
              {!isOwner && id !== meId && (
                <Popconfirm
                  title="Ban this user?"
                  description="They will be removed and cannot be invited back."
                  okText="Ban"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onBan(id)}
                >
                  <Button danger size="small" icon={<StopOutlined />}>
                    Ban
                  </Button>
                </Popconfirm>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

const RenameGroupModal = ({ open, onClose, currentName, onRename }) => {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setName(currentName); setBusy(false); }
  }, [open, currentName]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return antdMessage.warning("Name cannot be empty");
    if (trimmed === currentName) return onClose();
    setBusy(true);
    try {
      await onRename(trimmed);
      onClose();
    } catch (err) {
      antdMessage.error(err?.response?.data?.error || "Could not rename");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Rename group"
      okText="Save"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="large"
        autoFocus
        placeholder="Group name"
        style={{ marginTop: 8 }}
      />
    </Modal>
  );
};

// ── User picker shared by modals ───────────────────────────────────────────
const UserPicker = ({ value, onChange, mode = "multiple", excludeIds = [], placeholder }) => {
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    api.searchUsers("").then((users) => {
      setOptions(users.filter((u) => !exclude.has(u.id)));
    }).catch(() => {});
  }, [exclude]);

  const onSearch = async (q) => {
    setSearching(true);
    try {
      const users = await api.searchUsers(q);
      setOptions(users.filter((u) => !exclude.has(u.id)));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Select
      mode={mode}
      value={value}
      onChange={onChange}
      onSearch={onSearch}
      filterOption={false}
      showSearch
      loading={searching}
      placeholder={placeholder}
      style={{ width: "100%" }}
      size="large"
      optionLabelProp="label"
    >
      {options.map((u) => (
        <Select.Option key={u.id} value={u.id} label={fullName(u)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <Avatar
              size={28}
              style={{
                background: PALETTE.accent,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {initialsOf(u)}
            </Avatar>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <Text strong style={{ fontSize: 13 }}>{fullName(u)}</Text>
              <Text style={{ color: PALETTE.textSoft, fontSize: 11 }}>{u.email}</Text>
            </div>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
};

const NewGroupModal = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setName(""); setMemberIds([]); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!name.trim() || memberIds.length === 0) {
      antdMessage.warning("Pick a name and at least one member");
      return;
    }
    setBusy(true);
    try {
      await onCreate({ name: name.trim(), memberIds });
      onClose();
    } catch {
      antdMessage.error("Could not create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="New group"
      okText="Create group"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        <Input
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="large"
        />
        <UserPicker
          value={memberIds}
          onChange={setMemberIds}
          placeholder="Add members"
        />
      </div>
    </Modal>
  );
};

const NewPrivateModal = ({ open, onClose, onSend }) => {
  const [recipientId, setRecipientId] = useState(undefined);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setRecipientId(undefined); setContent(""); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!recipientId || !content.trim()) {
      antdMessage.warning("Pick a recipient and write a message");
      return;
    }
    setBusy(true);
    try {
      await onSend({ recipientId, content: content.trim() });
      onClose();
    } catch {
      antdMessage.error("Could not send");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="New message"
      okText="Send"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        <UserPicker
          mode={undefined}
          value={recipientId}
          onChange={setRecipientId}
          placeholder="To: pick a user"
        />
        <Input.TextArea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your message…"
        />
      </div>
    </Modal>
  );
};

const InviteModal = ({ open, onClose, onInvite, excludeIds }) => {
  const [userId, setUserId] = useState(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setUserId(undefined); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await onInvite(userId);
      antdMessage.success("Invited");
      onClose();
    } catch {
      antdMessage.error("Could not invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Invite to group"
      okText="Invite"
      onOk={submit}
      confirmLoading={busy}
      centered
    >
      <div style={{ paddingTop: 8 }}>
        <UserPicker
          mode={undefined}
          value={userId}
          onChange={setUserId}
          excludeIds={excludeIds}
          placeholder="Pick a user"
        />
      </div>
    </Modal>
  );
};

export default Messages;
