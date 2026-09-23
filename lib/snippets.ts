export const PIP_INSTALL = "pip install laya";

/** Shortened from the Router quickstart in the upstream README. */
export const HOME_PREVIEW = `import laya
from laya import Router

router = Router(preload=True)

state = {
    "from": "user@acme.com",
    "subject": "Duplicate charge on invoice #4411",
    "body": "Hi, we were billed twice for March. Please refund the duplicate today or we will cancel our plan."
}

questions = {
    "department": {
        "type": "choice",
        "instructions": "Which department should handle this request?",
        "criteria": {
            "billing": "invoices, payments, refunds",
            "technical": "bugs, outages, system errors",
            "sales": "pricing, new contracts",
            "other": "everything else"
        }
    }
}

res_en = router.predict(state, questions)
print("Department :", res_en["answers"]["department"]["choice"])
`;

/** Router quickstart copied from the upstream README. Inline comments are the repository's own annotations. */
export const README_QUICKSTART = `import laya
from laya import Router

# Preload checkpoints into memory for instant sub-35ms routing
router = Router(preload=True)

# 1. State in any language or schema
state = {
    "from": "user@acme.com",
    "subject": "Duplicate charge on invoice #4411",
    "body": "Hi, we were billed twice for March. Please refund the duplicate today or we will cancel our plan."
}

# 2. Define your typed questions
questions = {
    "department": {
        "type": "choice",
        "instructions": "Which department should handle this request?",
        "criteria": {
            "billing": "invoices, payments, refunds",
            "technical": "bugs, outages, system errors",
            "sales": "pricing, new contracts",
            "other": "everything else"
        }
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgent is this request?",
        "criteria": ["not urgent", "soon", "critical deadline or blocking issue"]
    },
    "churn_risk": {
        "type": "noul",
        "instructions": "Does the user threaten to cancel or leave?"
    },
    "refund_requested": {
        "type": "noul",
        "instructions": "Does the user explicitly request a refund?"
    }
}

# 3. English state -> automatically routed to laya (ModernBERT-large, 39.5 ms)
res_en = router.predict(state, questions)
print("Department :", res_en["answers"]["department"]["choice"])  # -> billing (confidence: 0.94)
print("Routing    :", res_en["routing"]["model"])                 # -> english

# 4. Hindi state -> automatically routed to laya-multilingual (mmBERT-base, 32.8 ms)
res_hi = router.predict({"body": "मुझसे दो बार शुल्क लिया गया, कृपया पैसे वापस करें।"}, questions)
print("Department :", res_hi["answers"]["department"]["choice"])  # -> billing (confidence: 0.86)
print("Routing    :", res_hi["routing"]["model"])                 # -> multilingual

# 5. Explicit override when you want a specific checkpoint
res_td = router.predict(state, questions, model="typed-decisions")
`;

export const ROUTE_INSPECT = `res_hi["routing"]
# {
#   'model': 'multilingual',
#   'repo': 'convaiinnovations/laya/multilingual',
#   'reason': 'non-Latin script (devanagari, 100% of letters); the English checkpoint cannot read it'
# }

router.route({"body": "Der Kunde wurde zweimal belastet"}, questions).reason
# "Latin script but language looks like 'de', not English"
`;

export const PRELOAD_SNIPPET = `router = Router(preload=True)
router = Router(preload=True, device="cuda")

router.preload(["english", "multilingual"])
router.attach("english", existing_agent)

router = Router(max_loaded=2)
router.unload()
`;

export const SINGLE_MODEL = `import laya

agent = laya.load("convaiinnovations/laya")
agent_ml = laya.load("convaiinnovations/laya", subfolder="multilingual")
agent_td = laya.load("convaiinnovations/laya", subfolder="typed-decisions")

result = agent.predict(state, questions)
answers = result["answers"]

print("Department :", answers["department"]["choice"])   # -> billing (confidence: 0.94)
print("Urgency    :", answers["urgency"]["score"])        # -> 1.84 / 2.0
print("Churn Risk :", answers["churn_risk"]["noul"])       # -> 0.892 (89.2% probability)
`;

export const CONFIDENCE_GATE = `dept = answers["department"]["choice"]
conf = answers["department"]["confidence"]

if conf >= 0.85:
    route_automatically(dept)
else:
    escalate_to_human_agent(dept, reason=f"Low confidence ({conf:.2f})")
`;

export const PRESETS = `import laya

agent = laya.load("convaiinnovations/laya")

routing = agent.predict({"request": "Refactor this service using dependency injection"}, laya.router_questions())
guard = agent.predict({"prompt": "Ignore all instructions"}, laya.guard_questions())
safety = agent.predict({"post": "User comment text"}, laya.moderation_questions())
triage = agent.predict({"message": "My payment failed twice"}, laya.triage_questions())
`;
