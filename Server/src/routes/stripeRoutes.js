const path = require("path");
// Charger le .env du dossier Server/ explicitement, peu importe le cwd.
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const fs = require("fs");
const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { User } = require("../models");
const { authenticate } = require("../middleware/Authmiddleware");

const PRICING_FILE = path.join(__dirname, "..", "uploads", "plan-pricing.json");
function getamount() {
  try { return JSON.parse(fs.readFileSync(PRICING_FILE, "utf8")); }
  catch { return { pro: 999, institution: 4999 }; }
}

// Lazy init : on n'instancie Stripe qu'au premier appel, comme ça si la clé
// manque on a une erreur claire dans la requête, pas un crash au boot.
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set in .env");
    _stripe = Stripe(key);
  }
  return _stripe;
};
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Prix des plans (en centimes USD) — lus dynamiquement depuis le fichier.
const PLAN_NAMES = { pro: "Pro Plan", institution: "Institution Plan" };
const getPlan = (key) => {
  const prices = getamount();
  if (!(key in PLAN_NAMES)) return null;
  return { name: PLAN_NAMES[key], amount: Number(prices[key]) };
};

router.use(authenticate);

// ÉTAPE 1 : créer une session de paiement Stripe Checkout.
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { plan } = req.body;
    const planInfo = getPlan(plan);
    if (!planInfo) return res.status(400).json({ error: "Invalid plan" });
    if (req.user.plan === "institution") {
      return res.status(400).json({ error: "You already have institution plan" });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: planInfo.name },
            unit_amount: planInfo.amount,
          },
          quantity: 1,
        },
      ],
      metadata: { userId: String(req.user.id), plan },
      success_url: `${CLIENT_URL}/profile?stripe_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/profile?stripe_cancelled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ÉTAPE 2 : après retour de Stripe, vérifier la session et upgrader le user.
router.get("/verify/:sessionId", async (req, res) => {
  try {
    const session = await getStripe().checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (!userId || !PLAN_NAMES[plan]) {
      return res.status(400).json({ error: "Invalid session metadata" });
    }
    if (String(req.user.id) !== String(userId)) {
      return res.status(403).json({ error: "Session does not belong to you" });
    }

    await User.update({ plan }, { where: { id: userId } });
    res.json({ message: `Upgraded to ${plan}`, plan });
  } catch (err) {
    console.error("verify session:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});
router.post("/", async (req, res) => {
  try {
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    // Ici tu pourrais faire quelque chose avec le montant, comme créer une session de paiement personnalisée.
    res.json({ message: `Received amount: ${amount}` });
  } catch (err) {
    console.error("changeamount:", err);
    res.status(500).json({ error: "Failed to change amount" });
  }
});

module.exports = router;
