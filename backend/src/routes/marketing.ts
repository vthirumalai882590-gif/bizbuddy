import { Router } from 'express'

const router = Router()

router.get('/posts',    async (req: any, res: any) => res.json({ success: true, data: [] }))
router.post('/posts',   async (req: any, res: any) => res.json({ success: true, data: { id: Date.now().toString(), ...req.body, status: 'draft', createdAt: new Date().toISOString() } }))
router.get('/festivals',async (req: any, res: any) => res.json({
  success: true,
  data: [
    { name: 'Diwali',    date: 'Oct 2024', emoji: '🪔' },
    { name: 'Dussehra', date: 'Oct 2024', emoji: '🏹' },
    { name: 'Christmas', date: 'Dec 2024', emoji: '🎄' },
    { name: 'New Year',  date: 'Jan 2025', emoji: '🎆' },
  ],
}))

export default router