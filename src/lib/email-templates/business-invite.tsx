import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import { main, container, brandMark, h1, text, button, footer } from './_brand'

export interface BusinessInviteEmailProps {
  businessName: string
  creatorName: string
  subject: string
  bodyText: string
  inviteUrl: string
  siteName?: string
}

export const BusinessInviteEmail = ({
  businessName,
  creatorName,
  subject,
  bodyText,
  inviteUrl,
  siteName = 'Travidz',
}: BusinessInviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {creatorName} featured {businessName} on {siteName} — claim your listing
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brandMark}>{siteName}</Text>
        <Heading style={h1}>{subject}</Heading>
        {bodyText.split('\n').map((line, i) =>
          line.trim().length === 0 ? (
            <div key={i} style={{ height: 10 }} />
          ) : (
            <Text key={i} style={text}>
              {line}
            </Text>
          ),
        )}
        <Button style={button} href={inviteUrl}>
          Claim your listing
        </Button>
        <Hr style={{ borderColor: '#f0e4d6', margin: '24px 0' }} />
        <Text style={footer}>
          Replies to this email are managed inside {siteName}. To reply to{' '}
          {creatorName}, open the link above and use the conversation panel —
          every message is saved as part of the deal record.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BusinessInviteEmail