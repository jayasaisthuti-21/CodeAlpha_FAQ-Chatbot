const FAQS = [
  { q: "What are your shipping options?", a: "We offer standard shipping (5-7 business days, free over $50) and express shipping (1-2 business days, $12.99)." },
  { q: "How do I track my order?", a: "Once your order ships, you'll get an email with a tracking link. You can also check order status under 'My Orders' on your account page." },
  { q: "What is your return policy?", a: "You can return most items within 30 days of delivery for a full refund, as long as they're unused and in original packaging." },
  { q: "How do I cancel my order?", a: "Orders can be cancelled within 1 hour of placing them from the 'My Orders' page. After that, please contact support to request a cancellation." },
  { q: "Do you ship internationally?", a: "Yes, we ship to over 40 countries. International shipping costs and delivery times are shown at checkout based on your address." },
  { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards, PayPal, and Apple Pay." },
  { q: "How can I change my shipping address?", a: "If your order hasn't shipped yet, go to 'My Orders' and select 'Edit Address'. Once shipped, address changes aren't possible." },
  { q: "Is my payment information secure?", a: "Yes. All payments are processed through PCI-compliant, encrypted payment gateways. We never store your full card number." },
  { q: "How do I contact customer support?", a: "You can reach us via the chat widget, email at support@example.com, or phone Mon-Fri 9am-6pm." },
  { q: "Do you offer discounts for bulk orders?", a: "Yes, orders of 20+ units qualify for tiered discounts. Contact sales@example.com with your order details for a quote." },
];

const STOPWORDS = new Set(["a","an","the","is","are","do","does","did","i","you","my","your",
  "of","for","to","in","on","and","or","how","what","can","will","it","this","that","be","with"]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w && !STOPWORDS.has(w));
}

const corpusTokens = FAQS.map(f => tokenize(f.q));
const vocab = Array.from(new Set(corpusTokens.flat()));
const idf = {};
vocab.forEach(term => {
  const df = corpusTokens.filter(tokens => tokens.includes(term)).length;
  idf[term] = Math.log((1 + corpusTokens.length) / (1 + df)) + 1;
});

function tfVector(tokens) {
  const vec = {};
  tokens.forEach(t => { vec[t] = (vec[t] || 0) + 1; });
  const total = tokens.length || 1;
  Object.keys(vec).forEach(t => { vec[t] = vec[t] / total; });
  return vec;
}

function tfidfVector(tokens) {
  const tf = tfVector(tokens);
  const vec = {};
  Object.keys(tf).forEach(t => { vec[t] = tf[t] * (idf[t] || 0); });
  return vec;
}

function cosineSim(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  keys.forEach(k => {
    const a = vecA[k] || 0, b = vecB[k] || 0;
    dot += a * b; magA += a * a; magB += b * b;
  });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const faqVectors = corpusTokens.map(tokens => tfidfVector(tokens));

function bestMatch(userText) {
  const uVec = tfidfVector(tokenize(userText));
  let bestIdx = -1, bestScore = 0;
  faqVectors.forEach((vec, i) => {
    const score = cosineSim(uVec, vec);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  return { idx: bestIdx, score: bestScore };
}

const chatEl = document.getElementById("chat");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("userInput");
const suggestEl = document.getElementById("suggestions");

function addMessage(text, sender, scoreLabel) {
  const div = document.createElement("div");
  div.className = "msg " + sender;
  div.textContent = text;
  if (scoreLabel) {
    const s = document.createElement("span");
    s.className = "score";
    s.textContent = scoreLabel;
    div.appendChild(s);
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function respond(userText) {
  const { idx, score } = bestMatch(userText);
  const THRESHOLD = 0.12;
  if (idx === -1 || score < THRESHOLD) {
    addMessage("I'm not sure about that one. Could you rephrase, or try one of the suggestions below?", "bot");
  } else {
    addMessage(FAQS[idx].a, "bot", `matched: "${FAQS[idx].q}" · confidence ${(score*100).toFixed(0)}%`);
  }
}

formEl.addEventListener("submit", e => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  addMessage(text, "user");
  inputEl.value = "";
  setTimeout(() => respond(text), 250);
});

function renderSuggestions() {
  suggestEl.innerHTML = "";
  FAQS.slice(0, 4).forEach(f => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = f.q;
    chip.addEventListener("click", () => {
      addMessage(f.q, "user");
      setTimeout(() => respond(f.q), 200);
    });
    suggestEl.appendChild(chip);
  });
}

addMessage("Hi! I'm the store help bot. Ask me about shipping, orders, returns, payments and more.", "bot");
renderSuggestions();
