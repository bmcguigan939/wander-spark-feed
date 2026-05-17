import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  creatorName: string
  rolling12moFormatted: string
  earningsUrl: string
}

export const CreatorTierUnlockedEmail = ({ creatorName, rolling12moFormatted, earningsUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You unlocked Power Creator — 50% for life</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>You're locked at 50% — forever 🔒</Heading>
        <Text style={text}>
          {creatorName}, you just crossed {rolling12moFormatted} in rolling 12-month bookings.
          That makes you a <strong>Power Creator</strong> — your share of every booking
          commission is now permanently locked at 50%, no matter how long you've been on
          Travidz.
        </Text>
        <Button style={button} href={earningsUrl}>View earnings</Button>
        <Text style={footer}>
          You're receiving this because you earn commission on Travidz. Manage email
          preferences from Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default CreatorTierUnlockedEmail
