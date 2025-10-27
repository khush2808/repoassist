import { Webhook } from 'svix'
import { headers } from 'next/headers'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/server/db'
import { env } from '@/env'

export async function POST(req: Request) {
	// Get the headers
	const headerPayload = await headers()
	const svix_id = headerPayload.get("svix-id")
	const svix_timestamp = headerPayload.get("svix-timestamp")
	const svix_signature = headerPayload.get("svix-signature")

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response('Error occured -- no svix headers', {
			status: 400
		})
	}

	// Get the body
	const payload = await req.json()
	const body = JSON.stringify(payload)

	// Create a new Svix instance with your secret.
	const wh = new Webhook(env.CLERK_WEBHOOK_SECRET)

	let evt: WebhookEvent

	// Verify the payload with the headers
	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent
	} catch (err) {
		console.error('Error verifying webhook:', err)
		return new Response('Error occured', {
			status: 400
		})
	}

	// Handle the webhook
	const eventType = evt.type
	
	if (eventType === "user.created" || eventType === "user.updated") {
		const { id, image_url, first_name, last_name, email_addresses } = evt.data

		if (!email_addresses || email_addresses.length === 0) {
			return new Response('Error: No email address', { status: 400 })
		}

		const emailAddress = email_addresses[0]?.email_address ?? ""

		try {
			await db.user.upsert({
				where: { emailAddresses: emailAddress },
				update: {
					imageUrl: image_url,
					firstName: first_name,
					lastName: last_name,
				},
				create: {
					id: id,
					emailAddresses: emailAddress,
					imageUrl: image_url,
					firstName: first_name,
					lastName: last_name,
				}
			})

			console.log(`✅ User ${eventType}: ${emailAddress}`)
		} catch (error) {
			console.error('Error syncing user:', error)
			return new Response('Error syncing user', { status: 500 })
		}
	}

	return new Response('', { status: 200 })
}
