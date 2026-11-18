import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../state/context'
import { Button, Modal } from '../ui/primitives'

export function NewIncidentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { createIncident } = useWorkspace()
  const [title, setTitle] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [firmwareVersion, setFirmwareVersion] = useState('')
  const [firmwareSourceRef, setFirmwareSourceRef] = useState('')
  const [customerSymptom, setCustomerSymptom] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !deviceName.trim() || !firmwareVersion.trim() || !customerSymptom.trim()) return
    const id = createIncident({ title, deviceName, firmwareVersion, firmwareSourceRef, customerSymptom })
    setTitle(''); setDeviceName(''); setFirmwareVersion(''); setFirmwareSourceRef(''); setCustomerSymptom('')
    onClose()
    navigate(`/investigations/${id}`)
  }
  const input = 'h-9 w-full rounded-md border border-line-strong bg-[#070c16] px-3 text-[13px] text-fg focus:border-sky-400 focus:outline-none'
  return (
    <Modal open={open} onClose={onClose} title="New firmware investigation">
      <form onSubmit={submit} className="flex flex-col gap-4 p-4">
        <p className="text-[12px] text-muted">Start with a customer symptom. Attach an ESP-IDF serial log on the next screen. Nothing is uploaded to a server.</p>
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">Issue title *
          <input className={input} required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Telemetry stops after Wi-Fi returns" />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">Device name *
          <input className={input} required value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="ESP32 energy monitor" />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">Firmware version *
          <input className={input} required value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} placeholder="v1.4.2 or commit SHA" />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">Source repository / exact commit (recommended)
          <input className={input} value={firmwareSourceRef} onChange={(e) => setFirmwareSourceRef(e.target.value)} placeholder="Git URL at a specific commit" />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">Reported symptom / expected behavior *
          <textarea className={`${input} min-h-[95px] py-2`} required value={customerSymptom} onChange={(e) => setCustomerSymptom(e.target.value)} placeholder="After a 10-second outage the device gets an IP address but no telemetry reaches the broker. Expected: reporting resumes within 10 seconds." />
        </label>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Create investigation</Button>
        </div>
      </form>
    </Modal>
  )
}
