import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

interface Props {
  creatorName: string
  dealTitle: string
  commissionFormatted: string
  orderValueFormatted: string
  earningsUrl: string
}

export const RedemptionConfirmedCreatorEmail = ({
  creatorName,
  dealTitle,
  commissionFormatted,
  orderValueFormatted,
  earningsUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You earned {commissionFormatted} on {dealTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>Travidz</Text>
        <Heading style={h1}>You just earned {commissionFormatted} 🎉</Heading>
        <Text style={text}>
          Hey {creatorName}, a booking on <strong>{dealTitle}</strong> ({orderValueFormatted})
          was just confirmed. Your commission has been added to your earnings ledger and will
          clear for payout in 14 days.
        </Text>
        <Button style={button} href={earningsUrl}>View earnings</Button>
        <Text style={footer}>
          You're receiving this because you have a deal commission on Travidz. Manage email
          preferences from Settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RedemptionConfirmedCreatorEmail