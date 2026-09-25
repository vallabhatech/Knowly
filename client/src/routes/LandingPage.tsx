import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Sage } from '../components/Sage';
import { Icon } from '../components/icons';
import { PGButton } from '../components/primitives';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <button className="landing-brand" onClick={() => navigate('/')} aria-label="PocketGuru home">
            <Sage pose="wave" size={42} animated={false} />
            <span>PocketGuru</span>
          </button>
          <nav className="landing-links" aria-label="Landing navigation">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <button onClick={() => navigate('/login')}>Log in</button>
            <PGButton variant="primary" size="md" onClick={() => navigate('/login')}>Get started</PGButton>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <FloatingShape className="shape-a" kind="star" />
          <FloatingShape className="shape-b" kind="bolt" />
          <FloatingShape className="shape-c" kind="dot" />
          <FloatingShape className="shape-d" kind="square" />
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <div className="landing-pill">
                <span />
                Free forever · No ads
              </div>
              <h1>
                Snap a page.
                <br />
                Ace the test.
                <br />
                <span>That&apos;s it.</span>
              </h1>
              <p>
                Photograph notes, slides, or a textbook chapter. Sage builds a study guide,
                flashcards, and a quiz from the material you already have.
              </p>
              <div className="landing-hero-actions">
                <PGButton variant="primary" size="lg" icon={<Icon.Camera s={20} />} onClick={() => navigate('/app')}>
                  Snap notes
                </PGButton>
              </div>
              <button
                onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', fontWeight: 800, fontSize: 13, cursor: 'pointer', marginTop: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                See how it works ↓
              </button>
            </div>
            <div className="landing-phone-wrap">
              <PhoneMock />
              <div className="landing-sage-peek">
                <Sage pose="happy" size={140} />
              </div>
              <div className="landing-cloud">+10 ATP earned</div>
            </div>
          </div>
        </section>

        <section id="how" className="landing-section">
          <SectionHeading eyebrow="How it works" title="Three steps. Ten seconds." />
          <div className="landing-steps">
            <StepCard num="1" tone="yellow" sage="read" title="Snap your notes" body="Camera or upload: handwritten pages, printed chapters, slides, and PDFs all work." />
            <StepCard num="2" tone="blue" sage="think" title="Sage reads it" body="OCR and AI extract key concepts and build a personal study guide from your source." />
            <StepCard num="3" tone="green" sage="cheer" title="Quiz yourself" body="Practice with smart questions, instant feedback, and citations from your document." />
          </div>
        </section>

        <section id="features" className="landing-section landing-section-white">
          <SectionHeading eyebrow="Features" title="Everything you need. Nothing you don't." />
          <div className="landing-feature-grid">
            <FeatureCard tone="green" icon={<Icon.Camera s={26} />} title="Snap to study" body="Point your camera at any page. We OCR it, summarize it, and pull out the key concepts." />
            <FeatureCard tone="yellow" icon={<Icon.Sparkle s={26} />} title="Concept maps" body="See how ideas connect. Tap any node for the definition and related terms." />
            <FeatureCard tone="blue" icon={<Icon.Flip s={26} />} title="Smart flashcards" body="Auto-generated from your material. Swipe through and flip to reveal." />
            <FeatureCard tone="pink" icon={<Icon.Check s={26} />} title="Source-cited quizzes" body="Every answer points back to your original notes so the practice stays grounded." />
            <FeatureCard tone="purple" icon={<Icon.Fire s={26} />} title="Progress cues" body="Score history and weak-spot review keep your next study session focused." />
            <FeatureCard tone="orange" icon={<Icon.Library s={26} />} title="Full library" body="Every snap is saved. Search, sort, and revisit anything you've studied." />
          </div>
        </section>

        <section className="landing-sage-band">
          <div>
            <h2>Meet Sage, your study buddy.</h2>
            <p>Sage lives inside every study guide — tap the owl on a guide to ask a quick question and get a short, expert answer.</p>
            <PGButton variant="primary" size="lg" icon={<Icon.Camera s={20} />} onClick={() => navigate('/app')}>Snap a page to start</PGButton>
          </div>
          <div className="landing-sage-row">
            <Sage pose="think" size={120} animated={false} />
            <Sage pose="cheer" size={170} />
            <Sage pose="happy" size={120} animated={false} />
          </div>
        </section>

        <section id="pricing" className="landing-section landing-pricing">
          <SectionHeading title="Free. Forever. Really." />
          <p>Unlimited snaps and unlimited quizzes. Premium study rooms and offline mode are planned for later.</p>
          <PGButton variant="primary" size="lg" icon={<Icon.Camera s={20} />} onClick={() => navigate('/login')}>
            Get started free
          </PGButton>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div className="landing-footer-brand">
              <Sage pose="wave" size={36} animated={false} />
              <span>PocketGuru</span>
            </div>
            <p>Study guides and quizzes from your camera. Built by students, for students.</p>
          </div>
          <div className="landing-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <button onClick={() => navigate('/login')}>Log in</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="landing-section-heading">
      {eyebrow && <div>{eyebrow}</div>}
      <h2>{title}</h2>
    </div>
  );
}

function FloatingShape({ className, kind }: { className: string; kind: 'star' | 'bolt' | 'dot' | 'square' }) {
  return (
    <div className={`landing-shape ${className}`}>
      {kind === 'star' && <Icon.Star s={38} />}
      {kind === 'bolt' && <Icon.Lightning s={34} />}
      {kind === 'dot' && <span className="dot" />}
      {kind === 'square' && <span className="square" />}
    </div>
  );
}

function PhoneMock() {
  const options = ['Mitochondrial matrix', 'Cytoplasm', 'Nucleus', 'Ribosome'];
  return (
    <div className="landing-phone">
      <div className="landing-phone-screen">
        <div className="landing-phone-header">
          <strong>Quiz</strong>
          <span>03/10</span>
        </div>
        <div className="landing-phone-progress"><span /></div>
        <div className="landing-phone-body">
          <div className="t-eyebrow">Question 3</div>
          <h3>Where does glycolysis occur?</h3>
          {options.map((option, i) => (
            <div key={option} className={i === 1 ? 'correct' : ''}>
              <span>{i === 1 ? <Icon.Check s={13} /> : String.fromCharCode(65 + i)}</span>
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCard({ num, tone, sage, title, body }: { num: string; tone: string; sage: 'read' | 'think' | 'cheer'; title: string; body: string }) {
  return (
    <div className={`landing-step tone-${tone}`}>
      <span>{num}</span>
      <Sage pose={sage} size={120} animated={false} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function FeatureCard({ tone, icon, title, body }: { tone: string; icon: ReactNode; title: string; body: string }) {
  return (
    <div className="landing-feature">
      <div className={`feature-icon tone-${tone}`}>{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}

