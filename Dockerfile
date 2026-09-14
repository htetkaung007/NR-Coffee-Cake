# ===== Line 1: Base Image =====
# node:20-slim = Node.js version 20 ကို "slim" (အနည်းငယ်ချုံ့ထားတဲ့) Linux OS ပေါ်မှာ
# ကြိုတင်ထည့်ပြီးသား image ကို base (အခြေခံ) အနေနဲ့ ယူသုံးမယ်လို့ ဆိုလိုတာပါ
FROM node:20-slim

# ===== Line 2: System libraries install =====
# Café Maw project က `sharp` (image processing library) ကို သုံးထားတယ်
# sharp က native binary (C++ code) ကို compile လုပ်ဖို့ system-level
# libraries (build-essential, python3, libvips-dev) လိုအပ်ပါတယ်
# git ကိုလည်း ထည့်တယ် — Claude Code က git diff/commit တွေ လုပ်ရနိုင်လို့
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    python3 \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# ===== Line 3: Claude Code install =====
# npm (Node package manager) ကို သုံးပြီး Claude Code ကို
# global အနေနဲ့ (container ထဲက ဘယ်နေရာကနေမဆို run လို့ရအောင်) install လုပ်တယ်
RUN npm install -g @anthropic-ai/claude-code

# ===== Line 4: Working directory =====
# Container ထဲမှာ command တွေ run မယ့် "current folder" ကို သတ်မှတ်တာ
# ဒီ folder မရှိသေးရင် Docker က အလိုအလျောက် ဆောက်ပေးမယ်
WORKDIR /workspace

# ===== Line 5: Default command =====
# Container ကို run လိုက်တာနဲ့ ဘာ command ကို အလိုအလျောက် run မလဲ
# ဒီနေရာမှာတော့ bash shell ကို ဖွင့်ထားမယ် — Htet ကိုယ်တိုင် `claude` လို့ ရိုက်ပြီးမှ run နိုင်အောင်
CMD ["bash"]