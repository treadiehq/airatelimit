<template>
  <div class="min-h-screen bg-black relative antialiased">
		<div class="radial-gradient absolute top-0 md:right-14 right-5"></div>
    <NavHeader />
    
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
      <p class="text-gray-500 text-sm mb-4">Updated January 1st, 2026</p>
      <h1 class="text-3xl font-bold text-white mb-8">Terms Of Use</h1>
      
      <div class="prose prose-invert prose-gray max-w-none space-y-8 text-gray-300 leading-relaxed">
        <p>
          Treadie Inc. ("Treadie") operates the AI Ratelimit Service, which we hope You (the "Customer", "You", or "Your") use. If You use it, please use it responsibly. If You don't, we'll have to terminate Your account.
        </p>
        <p>
          You own the business data that you provide to Treadie and You're responsible for keeping it safe.
        </p>
        <p>
          The Terms of Use (the "Terms"), the AI Ratelimit Service (as defined herein), and our prices can change at any time. We'll warn you 30 days in advance of any price changes. We'll try to warn you about major changes to the Terms of AI Ratelimit, but we make no guarantees.
        </p>
        <p>
          That's the basic idea, but you must read through the entire below and agree with all the details before you use any of our sites (whether or not You have created an account).
        </p>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Accepting these Terms</h2>
          <p>
            If you access or use the Service, it means you agree to be bound by all of the terms below. So, before you use the Service, please read all of the terms. If you don't agree to all of the terms below, please do not use the Service. Also, if a term does not make sense to you, please let us know by sending a mail to <a href="mailto:info@airatelimit.com" class="text-blue-300 hover:underline">info@airatelimit.com</a>.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Changes to these Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. For instance, we may need to change these Terms if we come out with a new feature or for some other reason.
          </p>
          <p>
            Whenever we make changes to these Terms, the changes are effective 3 days after we post such revised Terms (indicated by revising the date at the top of these Terms) or upon your acceptance if we provide a mechanism for your immediate acceptance of the revised Terms (such as a click-through confirmation or acceptance button). It is your responsibility to check AI Ratelimit for changes to these Terms.
          </p>
          <p>
            If you continue to use the Service after the revised Terms go into effect, then you have accepted the changes to these Terms.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Privacy Policy</h2>
          <p>
            For information about how we collect and use information about users of the Service, please check out our privacy policy available at <NuxtLink to="/privacy" class="text-blue-300 hover:underline">AI Ratelimit privacy</NuxtLink>.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Description of Service</h2>
          <p>
            AI Ratelimit provides an API proxy service that sits between your application and AI providers such as OpenAI, Anthropic, Google, Mistral, and others. The Service enables you to:
          </p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li>Enforce per-user rate limits on AI API requests;</li>
            <li>Track usage and costs per user, per model;</li>
            <li>Securely proxy API requests without exposing AI provider credentials in client-side code;</li>
            <li>Configure different limits for different pricing tiers; and</li>
            <li>Display custom upgrade messages when users exceed their limits.</li>
          </ul>
          <p>
            <strong class="text-white">Important:</strong> AI Ratelimit acts solely as a proxy. We do not store, log, or have access to the content of your prompts, messages, or AI responses. Request content passes through our servers and is immediately forwarded to the AI provider. We only store metadata (token counts, timestamps, costs) for rate limiting and analytics purposes.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">API Keys & Credentials</h2>
          <p>
            The Service offers two modes of operation:
          </p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li><strong class="text-white">Pass-through Mode:</strong> You provide your AI provider API key with each request. We forward it to the AI provider and never store it.</li>
            <li><strong class="text-white">Stored Keys Mode:</strong> You store your AI provider API keys in our dashboard. Keys are encrypted at rest using industry-standard encryption.</li>
          </ul>
          <p>
            You are solely responsible for the security of your API keys and project credentials. If you believe your credentials have been compromised, you must regenerate them immediately through the dashboard. We are not liable for unauthorized use resulting from compromised credentials.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Third-Party Services</h2>
          <p>
            The Service proxies requests to third-party AI providers including but not limited to OpenAI, Anthropic, Google, Mistral, Groq, and xAI. Your use of these AI providers through our Service is subject to their respective terms of service and acceptable use policies. You are responsible for ensuring your use complies with both our Terms and the terms of the underlying AI provider.
          </p>
          <p>
            We are not responsible for the content, accuracy, or availability of responses from AI providers. AI provider APIs may experience downtime, rate limiting, or changes that affect the Service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Your Content & Conduct</h2>
          <p>
            Our Service allows you and other users to post, link and otherwise make available content. You are responsible for the content that you make available to the Service, including its legality, reliability, and appropriateness.
          </p>
          <p>
            When you post, link or otherwise make available content to the Service, you grant us the right and license to use, reproduce, modify, publicly perform, publicly display and distribute your content on or through the Service. We may format your content for display throughout the Service, but we will not edit or revise the substance of your content itself.
          </p>
          <p>
            Aside from our limited right to your content, you retain all of your rights to the content you post, link and otherwise make available on or through the Service.
          </p>
          <p>
            You can remove the content that you posted by deleting it. Once you delete your content, it will not appear on the Service, but copies of your deleted content may remain in our system or backups for some period of time.
          </p>
          <p>You may not post, link and otherwise make available on or through the Service any of the following:</p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li>Content that is libelous, defamatory, bigoted, fraudulent or deceptive;</li>
            <li>Content that is illegal or unlawful, that would otherwise create liability;</li>
            <li>Content that may infringe or violate any patent, trademark, trade secret, copyright, right of privacy, right of publicity or other intellectual or other right of any party;</li>
            <li>Mass or repeated promotions, political campaigning or commercial messages directed at users who do not follow you (SPAM);</li>
            <li>Private information of any third party (e.g., addresses, phone numbers, email addresses, Social Security numbers and credit card numbers); and</li>
            <li>Viruses, corrupted data or other harmful, disruptive or destructive files or code.</li>
          </ul>
          <p>Also, you agree that you will not do any of the following in connection with the Service or other users:</p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li>Use the Service in any manner that could interfere with, disrupt, negatively affect or inhibit other users from fully enjoying the Service or that could damage, disable, overburden or impair the functioning of the Service;</li>
            <li>Impersonate or post on behalf of any person or entity or otherwise misrepresent your affiliation with a person or entity;</li>
            <li>Collect any personal information about other users, or intimidate, threaten, stalk or otherwise harass other users of the Service;</li>
            <li>Create an account or post any content if you are not over 13 years of age; and</li>
            <li>Circumvent or attempt to circumvent any filtering, security measures, rate limits or other features designed to protect the Service, users of the Service, or third parties.</li>
          </ul>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Treadie Materials</h2>
          <p>
            We put a lot of effort into creating the Service including, the logo and all designs, text, graphics, pictures, information and other content (excluding your content). This property is owned by us or our licensors and it is protected by U.S. and international copyright laws. We grant you the right to use it.
          </p>
          <p>However, unless we expressly state otherwise, your rights do not include:</p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li>Publicly performing or publicly displaying the Service;</li>
            <li>Modifying or otherwise making any derivative uses of the Service or any portion thereof;</li>
            <li>Using any data mining, robots or similar data gathering or extraction methods;</li>
            <li>Downloading (other than page caching) of any portion of the Service or any information contained therein;</li>
            <li>Reverse engineering or accessing the Service in order to build a competitive product or service; or</li>
            <li>Using the Service other than for its intended purposes.</li>
          </ul>
          <p>If you do any of this stuff, we may terminate your use of the Service.</p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Hyperlinks and Third Party Content</h2>
          <p>
            You may create a hyperlink to the Service. But, you may not use, frame or utilize framing techniques to enclose any of our trademarks, logos or other proprietary information without our express written consent.
          </p>
          <p>
            Treadie, Inc. makes no claim or representation regarding, and accepts no responsibility for third party websites accessible by hyperlink from the Service or websites linking to the Service. When you leave the Service, you should be aware that these Terms and our policies no longer govern.
          </p>
          <p>
            If there is any content on the Service from you and others, we don't review, verify or authenticate it, and it may include inaccuracies or false information. We make no representations, warranties, or guarantees relating to the quality, suitability, truth, accuracy or completeness of any content contained in the Service. You acknowledge sole responsibility for and assume all risk arising from your use of or reliance on any content.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Unavoidable Legal Stuff</h2>
          <p class="uppercase text-sm">
            THE SERVICE AND ANY OTHER SERVICE AND CONTENT INCLUDED ON OR OTHERWISE MADE AVAILABLE TO YOU THROUGH THE SERVICE ARE PROVIDED TO YOU ON AN AS IS OR AS AVAILABLE BASIS WITHOUT ANY REPRESENTATIONS OR WARRANTIES OF ANY KIND. WE DISCLAIM ANY AND ALL WARRANTIES AND REPRESENTATIONS (EXPRESS OR IMPLIED, ORAL OR WRITTEN) WITH RESPECT TO THE SERVICE AND CONTENT INCLUDED ON OR OTHERWISE MADE AVAILABLE TO YOU THROUGH THE SERVICE WHETHER ALLEGED TO ARISE BY OPERATION OF LAW, BY REASON OF CUSTOM OR USAGE IN THE TRADE, BY COURSE OF DEALING OR OTHERWISE.
          </p>
          <p class="uppercase text-sm">
            IN NO EVENT WILL TREADIE, INC. BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY SPECIAL, INDIRECT, INCIDENTAL, EXEMPLARY OR CONSEQUENTIAL DAMAGES OF ANY KIND ARISING OUT OF OR IN CONNECTION WITH THE SERVICE OR ANY OTHER SERVICE AND/OR CONTENT INCLUDED ON OR OTHERWISE MADE AVAILABLE TO YOU THROUGH THE SERVICE, REGARDLESS OF THE FORM OF ACTION, WHETHER IN CONTRACT, TORT, STRICT LIABILITY OR OTHERWISE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES OR ARE AWARE OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ALL CAUSES OF ACTION AND UNDER ALL THEORIES OF LIABILITY WILL BE LIMITED TO THE AMOUNT YOU PAID TO TREADIE, INC. THIS SECTION WILL BE GIVEN FULL EFFECT EVEN IF ANY REMEDY SPECIFIED IN THIS AGREEMENT IS DEEMED TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.
          </p>
          <p>
            You agree to defend, indemnify and hold us harmless from and against any and all costs, damages, liabilities, and expenses (including attorneys' fees, costs, penalties, interest and disbursements) we incur in relation to, arising from, or for the purpose of avoiding, any claim or demand from a third party relating to your use of the Service or the use of the Service by any person using your account, including any claim that your use of the Service violates any applicable law or regulation, or the rights of any third party, and/or your violation of these Terms.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Copyright Complaints</h2>
          <p>
            We take intellectual property rights seriously. In accordance with the Digital Millennium Copyright Act ("DMCA") and other applicable law, we have adopted a policy of terminating, in appropriate circumstances and, at our sole discretion, access to the service for users who are deemed to be repeat infringers.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Governing Law</h2>
          <p>
            The validity of these Terms and the rights, obligations, and relations of the parties under these Terms will be construed and determined under and in accordance with the laws of the Delaware state, without regard to conflicts of law principles.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Jurisdiction</h2>
          <p>
            You expressly agree that exclusive jurisdiction for any dispute with the Service or relating to your use of it, resides in the courts of the Delaware state and you further agree and expressly consent to the exercise of personal jurisdiction in the courts of the Delaware state in connection with any such dispute including any claim involving Service. You further agree that you and Service will not commence against the other a class action, class arbitration or other representative action or proceeding.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Termination</h2>
          <p>
            If you breach any of these Terms, we have the right to suspend or disable your access to or use of the Service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Entire Agreement</h2>
          <p>
            These Terms constitute the entire agreement between you and Treadie, Inc. regarding the use of the Service, superseding any prior agreements between you and Treadie, Inc. relating to your use of the Service.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Feedback</h2>
          <p>
            Please let us know what you think of the Service, these Terms and, in general, AI Ratelimit. When you provide us with any feedback, comments or suggestions about the Service, these Terms and, in general, AI Ratelimit, you irrevocably assign to us all of your right, title and interest in and to your feedback, comments and suggestions.
          </p>
        </section>

        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Questions & Contact Information</h2>
          <p>
            Questions or comments about the Service may be directed to us at the email address: <a href="mailto:info@airatelimit.com" class="text-blue-300 hover:underline">info@airatelimit.com</a>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Terms of Use - AI Ratelimit'
})
</script>
