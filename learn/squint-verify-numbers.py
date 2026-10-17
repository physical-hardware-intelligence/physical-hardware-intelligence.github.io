"""Compute (not recall) every number the Squint breakdown page quotes as "computed".

Run from a Squint checkout at commit 7086fd5 with its virtualenv:
    cd ~/squint && .venv/bin/python <this file> > 2026-10-15_squint-verified-numbers.json
Needs: torch, torchvision, gymnasium, numpy, scipy, and Squint's train_squint.py / utils.py on the path.
"""
import os, sys, math, types, json
sys.path.insert(0, os.path.expanduser("~/squint"))
import numpy as np, torch, torch.nn.functional as F, gymnasium as gym, torchvision
from scipy.stats import fisher_exact
import train_squint as ts
import utils as su

out = {"versions": {"torch": torch.__version__, "torchvision": torchvision.__version__, "numpy": np.__version__}}

# ---- 1. shapes and parameter counts (12 state numbers, 6 actions) ----
n_state, n_act = 12, 6
env = types.SimpleNamespace(unwrapped=types.SimpleNamespace(single_action_space=gym.spaces.Box(-1.0, 1.0, (n_act,), np.float32)))
enc = ts.CNNEncoder((16, 16, 3))
x = torch.zeros(1, 16, 16, 3)
h1 = enc.conv[0](x.permute(0, 3, 1, 2)); h2 = enc.conv[2](F.relu(h1))
out["conv_shapes"] = [list(h1.shape), list(h2.shape), int(enc(x).shape[1])]
act = ts.Actor(env, n_obs=enc.repr_dim, n_state=n_state, n_act=n_act)
crit = ts.Critic(n_obs=enc.repr_dim, n_state=n_state, n_act=n_act, num_atoms=101, v_min=-20.0, v_max=20.0, num_q=2)
cnt = lambda m: sum(p.numel() for p in m.parameters())
out["params"] = {"encoder": cnt(enc), "projection": cnt(act.proj), "actor": cnt(act), "critic": cnt(crit),
                 "deployed_encoder_plus_actor": cnt(enc) + cnt(act)}
ckpt = os.path.expanduser("~/squint/runs/reach_camtuned_2026-10-13/ckpt.pt")
if os.path.exists(ckpt):  # our retrained ReachCube checkpoint: confirms the 12-number state
    out["ckpt_state_proj_weight_shape"] = list(torch.load(ckpt, map_location="cpu")["actor"]["proj.state_proj.0.weight"].shape)

# ---- 2. replay buffer memory at each image size (Squint's own estimate function) ----
out["buffer_GiB"] = {s: round(su.calc_buffer_memory(rgb_dim=s * s * 3, state_dim=n_state, action_dim=n_act,
                                                    max_length=1_000_000), 3) for s in (16, 32, 64, 128)}

# ---- 3. schedule, replaying the loop's own conditions (train_squint.py L858, L876, L914, L923, L860) ----
A = ts.Args()
iters = A.total_timesteps // A.num_envs + 2                       # "+2 for final eval"
steps = [i * A.num_envs for i in range(iters)]
learn = [s for s in steps if s > A.learning_starts]
out["schedule"] = {
    "loop_iterations": iters, "transitions_collected": iters * A.num_envs,
    "random_action_iterations": sum(1 for s in steps if s < A.learning_starts),
    "iterations_with_updates": len(learn),
    "critic_encoder_alpha_updates": len(learn) * A.num_updates,
    "actor_updates": len(learn) * sum(1 for g in range(A.num_updates) if g % A.policy_frequency == 0),
    "evaluations": sum(1 for s in steps if ((s - A.num_envs) // A.eval_freq) < (s // A.eval_freq)),
    "UTD": A.num_updates / A.num_envs, "samples_drawn_per_iteration": A.num_updates * A.batch_size,
    "samples_drawn_per_transition_collected": A.num_updates * A.batch_size / A.num_envs,
    "buffer_iterations_of_history": A.buffer_size / A.num_envs,
    "gamma": A.gamma, "horizon_1_over_1_minus_gamma": 1 / (1 - A.gamma), "gamma_pow_10": A.gamma ** 10, "gamma_pow_50": A.gamma ** 50,
    "tau": A.tau, "target_half_life_updates": math.log(0.5) / math.log(1 - A.tau),
    "delta_z": (A.v_max - A.v_min) / (A.num_atoms - 1), "alpha_arg_unused_under_autotune": A.alpha, "autotune": A.autotune}

# ---- 4. C51 projection edge cases ----
# 4a. literal Algorithm 1 (Bellemare et al. 2017) vs Squint, float32, Squint's support, r = 0, gamma = 1
z = torch.linspace(-20, 20, 101)
b = (z.clamp(-20, 20) + 20.0) / 0.4
exact = torch.floor(b) == torch.ceil(b)
pu = torch.full((101,), 1 / 101)
lo, up = torch.floor(b).long(), torch.ceil(b).long()
m_lit = torch.zeros(101); m_lit.index_add_(0, lo, pu * (up.float() - b)); m_lit.index_add_(0, up, pu * (b - lo.float()))
c_def = ts.Critic(n_obs=1024, n_state=12, n_act=6, num_atoms=101, v_min=-20.0, v_max=20.0, num_q=2)
with torch.no_grad():
    m_sq = c_def.categorical(torch.randn(1, 1024), torch.randn(1, 12), torch.randn(1, 6), torch.zeros(1), torch.ones(1), 1.0)
out["c51_default_support_r0_g1"] = {"atoms_landing_exactly_on_grid": int(exact.sum()), "b_at_index_1": float(b[1]),
                                    "literal_algorithm_mass_kept_uniform_p": round(float(m_lit.sum()), 4),
                                    "squint_categorical_mass": round(float(m_sq.sum(-1).max()), 6)}
# 4b. Squint's own categorical() on a support where delta_z = 1 is exact (-50..50): an atom landing on b = 1 is counted twice
torch.manual_seed(0)
c = ts.Critic(n_obs=1024, n_state=12, n_act=6, num_atoms=101, v_min=-50.0, v_max=50.0, num_q=2)
rgb, st, ac = torch.randn(2, 1024), torch.randn(2, 12), torch.randn(2, 6)
with torch.no_grad():
    p = torch.softmax(c.forward(rgb, st, ac), -1)
    m = c.categorical(rgb, st, ac, torch.tensor([0.0, 1.0]), torch.ones(2), 1.0)
out["c51_double_count_dz1"] = {"r=0 (atom 1 lands on b=1): total_mass, p_atom1": [round(float(m[0, 0].sum()), 6), round(float(p[0, 0, 1]), 6)],
                               "r=1 (atom 0 lands on b=1): total_mass, p_atom0": [round(float(m[0, 1].sum()), 6), round(float(p[0, 1, 0]), 6)]}
# 4c. a realistic target: no exact hits, mass conserved
with torch.no_grad():
    m_r = c_def.categorical(torch.randn(3, 1024), torch.randn(3, 12), torch.randn(3, 6), torch.tensor([0.37, -1.2, 2.5]), torch.ones(3), 0.9)
out["c51_squint_mass_r_g0.9"] = [round(float(v), 6) for v in m_r.sum(-1).flatten()]

# ---- 5. temperature gradient sign, using the code's loss (L799) ----
res = {}
for case, log_pi in (("policy too sharp: log_pi=+10, entropy estimate -10 < -6", 10.0), ("policy too random: log_pi=-10, entropy estimate 10 > -6", -10.0)):
    log_alpha = torch.zeros(1, requires_grad=True)
    loss = (-log_alpha.exp() * (torch.tensor([log_pi]) + (-6.0))).mean(); loss.backward()
    res[case] = {"dLoss/dlog_alpha": round(float(log_alpha.grad), 3), "gradient_descent_moves_alpha": "up" if log_alpha.grad < 0 else "down"}
out["alpha_sign_code"] = res
# Squint paper, Algorithm 1: alpha <- alpha - grad_alpha[(H_target - H) * alpha]; the gradient is (H_target - H)
out["alpha_sign_paper_alg1"] = {"too sharp (H=-10)": "down" if (-6 - (-10)) > 0 else "up", "too random (H=10)": "down" if (-6 - 10) > 0 else "up"}

# ---- 6. tanh-Gaussian: code's log-prob (L326-329) vs exact density; entropy of a = tanh(u) ----
mu, sd = 0.3, 0.7
normal = torch.distributions.Normal(torch.tensor(mu), torch.tensor(sd))
xs = torch.tensor([-1.5, 0.0, 0.8, 2.2]); ys = torch.tanh(xs)
code = normal.log_prob(xs) - torch.log(1 * (1 - ys.pow(2)) + 1e-6)
exact_lp = normal.log_prob(torch.atanh(ys)) - torch.log(1 - ys.pow(2))
out["tanh_logprob_max_abs_diff"] = float((code - exact_lp).abs().max())
def H_tanh(m, ls, n=200001):  # H(a) = H(u) + E_u[log(1 - tanh^2 u)], stable log(1 - tanh^2 u) = 2(log 2 - |u| - log1p(e^{-2|u|}))
    s = math.exp(ls); u = np.linspace(m - 12 * s, m + 12 * s, n)
    pdf = np.exp(-0.5 * ((u - m) / s) ** 2) / (s * math.sqrt(2 * math.pi))
    lg = 2 * (math.log(2) - np.abs(u) - np.log1p(np.exp(-2 * np.abs(u))))
    return 0.5 * math.log(2 * math.pi * math.e * s * s) + np.trapezoid(pdf * lg, u)
def p_sat(m, ls, thr=0.95):
    s = math.exp(ls); t = math.atanh(thr); Phi = lambda v: 0.5 * (1 + math.erf(v / math.sqrt(2)))
    return (1 - Phi((t - m) / s)) + Phi((-t - m) / s)
grid = np.round(np.arange(-5, 2.0001, 0.01), 2); vals = [H_tanh(0.0, g) for g in grid]; k = int(np.argmax(vals))
lo_, hi_ = -5.0, 0.0
for _ in range(80):
    mid = (lo_ + hi_) / 2
    lo_, hi_ = (mid, hi_) if H_tanh(0.0, mid) < -1.0 else (lo_, mid)
out["tanh_entropy"] = {"max_at_mu0": {"log_sigma": float(grid[k]), "sigma": round(math.exp(grid[k]), 3), "H_nats": round(vals[k], 4), "uniform_log2": round(math.log(2), 4)},
                       "log_sigma_for_H_minus_1_per_dim_at_mu0": round((lo_ + hi_) / 2, 3), "sigma_for_H_minus_1": round(math.exp((lo_ + hi_) / 2), 4),
                       "presets": {f"mu={m},log_sigma={ls}": {"H_per_dim": round(H_tanh(m, ls), 3), "H_6_dims": round(6 * H_tanh(m, ls), 2),
                                                                 "P(|a|>0.95)": round(p_sat(m, ls), 3), "tanh(mu)": round(math.tanh(m), 3)}
                                   for m, ls in ((0, -0.13), (0, -2.41), (0, 2), (1.5, -2.5))}}

# ---- 7. area downsampling 128 -> 16 = mean of each 8x8 block; ColorJitter draws once per batch ----
img = torch.randint(0, 256, (2, 3, 128, 128)).float()
out["area_equals_8x8_mean"] = bool(torch.allclose(F.interpolate(img, size=(16, 16), mode="area"), F.avg_pool2d(img, 8)))
torch.manual_seed(0)
batch = torch.rand(1, 3, 16, 16).repeat(8, 1, 1, 1)
jit = torchvision.transforms.ColorJitter(0.3, 0.3, 0.3, 0.05)(batch)
out["jitter_one_draw_per_batch"] = bool(torch.allclose(jit, jit[:1].expand_as(jit)))

# ---- 8. motion, rewards, masses ----
out["arithmetic"] = {"sim_arm_deg_per_s_max": round(math.degrees(0.1 * 10), 1), "paper_real_deg_per_s": round(math.degrees(0.1 * 0.15 * 30), 2),
                     "phi_real_15Hz_deg_per_s": round(math.degrees(0.1 * 0.15 * 15), 2),
                     "1-tanh(5*0.1)": round(1 - math.tanh(0.5), 3), "1-tanh(5*0.2)": round(1 - math.tanh(1.0), 3),
                     "cube_mass_g": {e: round(200 * (e / 100) ** 3 * 1000, 2) for e in (2.2, 2.5, 2.8)}}

# ---- 9. statistics on the paper's real-robot counts (Tables II to V) ----
def wilson(k, n, zq=1.959963984540054):
    ph = k / n; d = 1 + zq * zq / n; cc = (ph + zq * zq / (2 * n)) / d; h = zq / d * math.sqrt(ph * (1 - ph) / n + zq * zq / (4 * n * n))
    return [round(100 * (cc - h), 1), round(100 * min(1, cc + h), 1)]
out["real_robot_stats"] = {name: {"of_80": k, "wilson95_pct": wilson(k, 80), "fisher_p_vs_squint_73": None if name == "Squint" else float(f"{fisher_exact([[73, 7], [k, 80 - k]])[1]:.3g}")}
                           for name, k in (("Squint", 73), ("SAC", 65), ("Squint no jitter", 58), ("DAgger", 53), ("PPO", 50), ("BC", 38), ("DrQ-v2", 8))}
out["real_robot_stats"]["per_task_wilson95_pct"] = {"10/10": wilson(10, 10), "8/10": wilson(8, 10), "6/10": wilson(6, 10)}
sq = [100.0, 100.0, 99.8, 98.8, 97.5, 96.3, 95.0, 81.2]; sac = [99.4, 99.1, 98.1, 95.4, 99.1, 98.6, 97.7, 18.7]
d = [round(a - b, 1) for a, b in zip(sq, sac)]
out["tableI_squint_minus_sac"] = {"per_task": d, "sum_of_first_seven": round(sum(d[:7]), 2), "stack_can": d[7],
                                  "mean_squint": round(sum(sq) / 8, 3), "mean_sac": round(sum(sac) / 8, 3)}
out["paper_percent_claims"] = {"no_jitter_drop_points": 73 / 80 * 100 - 58 / 80 * 100, "dagger_gap_points": 73 / 80 * 100 - 53 / 80 * 100}
print(json.dumps(out, indent=1))
