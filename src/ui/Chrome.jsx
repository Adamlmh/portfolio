import { profile, rooms } from '../content.js'

const hints = {
  outside: { title: '门口', hint: '点门进去' },
  lobby: { title: '门厅', hint: '滚动，或按上下键往前走' },
}

function hintFor(place) {
  if (hints[place]) return hints[place]
  const room = rooms.find((item) => item.id === place)
  if (!room) return hints.lobby
  return { title: room.sign, hint: '点这扇门，或按回车' }
}

export function Boot({ progress }) {
  const percent = Math.round(progress * 100)
  const turn = 290 * (1 - progress)
  return (
    <div className="boot" role="status">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="46" fill="none" stroke="#1c1c1c" strokeWidth="1.2" strokeDasharray="4 7" />
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="#1c1c1c"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="290"
          strokeDashoffset={turn}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <p className="boot-percent">{percent}%</p>
      <p className="boot-caption">正在把纸铺开</p>
    </div>
  )
}

export function Chrome({ place, openId, menuOpen, onToggleMenu, onActivate, onHome, onNudge, onGo, onOpen, onClose }) {
  const hint = hintFor(place)
  const room = rooms.find((item) => item.id === openId)
  return (
    <div className="ui">
      <div className="top">
        <p className="place">{hint.title}</p>
        <div className="top-actions">
          <a href={profile.github} target="_blank" rel="noreferrer">仓库</a>
          <button type="button" onClick={onToggleMenu} aria-expanded={menuOpen}>目录</button>
          {place !== 'outside' ? (
            <button type="button" onClick={onHome}>回到门口</button>
          ) : null}
        </div>
      </div>

      {menuOpen ? (
        <nav className="menu" aria-label="目录">
          <button type="button" onClick={() => onGo('outside')}>门口</button>
          <button type="button" onClick={() => onGo('lobby')}>门厅</button>
          {rooms.map((item) => (
            <button type="button" key={item.id} onClick={() => onOpen(item.id)}>
              <span>{item.sign}</span>
              <small>{item.title}</small>
            </button>
          ))}
          <p className="menu-note">方向键走动，回车开门，Esc 关上。</p>
        </nav>
      ) : null}

      <div className="bottom">
        <button type="button" onClick={() => onNudge(3.2)}>往后</button>
        <button type="button" className="slip" onClick={onActivate}>
          <strong>{hint.title}</strong>
          <span>{place === 'outside' ? '点这里进去' : hint.hint}</span>
        </button>
        <button type="button" onClick={() => onNudge(-3.2)}>往前</button>
      </div>

      {room ? (
        <aside className={room.side < 0 ? 'sheet sheet-left' : 'sheet'} role="dialog" aria-label={room.title}>
          <button type="button" className="close" onClick={onClose}>关上</button>
          <Article room={room} />
        </aside>
      ) : null}

      <div className="sr">
        {rooms.map((item) => (
          <Article key={item.id} room={item} />
        ))}
      </div>
    </div>
  )
}

function Article({ room }) {
  return (
    <article>
      {room.when ? <p className="when">{room.when}</p> : null}
      <h2>{room.title}</h2>
      <p className="lead">{room.lead}</p>
      {room.points ? (
        <>
          <h3>一些奖</h3>
          <ul>
            {room.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </>
      ) : null}
      {room.sections?.map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          {section.when ? <p className="meta">{section.when}</p> : null}
          <ul>
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
      {room.links?.map((link) => (
        <p key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
        </p>
      ))}
    </article>
  )
}
