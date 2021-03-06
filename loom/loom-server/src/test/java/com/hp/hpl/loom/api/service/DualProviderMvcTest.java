/*******************************************************************************
 * (c) Copyright 2017 Hewlett Packard Enterprise Development LP Licensed under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except in compliance with the License. You
 * may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 *******************************************************************************/
package com.hp.hpl.loom.api.service;

import static org.junit.Assert.fail;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.junit.After;
import org.junit.Before;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.web.context.WebApplicationContext;

@RunWith(SpringJUnit4ClassRunner.class)
@ContextConfiguration("/applicationContext-test-full-2providers.xml")
@WebAppConfiguration
public class DualProviderMvcTest extends DualProviderTestBase {
    private static final Log LOG = LogFactory.getLog(LoomServiceMvcActionsTest.class);

    @Autowired
    private WebApplicationContext ctx;

    @Before
    public void setUp() throws Exception {
        LOG.info("setUp start");
        super.setUp(1);
        LOG.info("setUp end");
    }

    @After
    public void cleanUp() {
        try {
            logoutProvider(logins);
        } catch (InterruptedException e) {
            fail();
        }
        LOG.info("Logged out");
    }

    @Override
    void setupTestAndClient(final int noOfClients) {
        LOG.info("setupTestAndClient start");
        setupMvcClient(ctx, noOfClients);
        LOG.info("setupTestAndClient end");
    }
}
